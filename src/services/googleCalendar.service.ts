import { randomUUID } from "crypto";
import { google } from "googleapis";
import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const SESSION_DURATION_MINUTES = 60;

const getRedirectUrl = () => {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";
  return `${baseUrl}/api/auth/callback/google`;
};

const getCalendarAccount = async (userId: string) => {
  return prisma.account.findFirst({
    where: {
      userId,
      providerId: "google",
      OR: [{ accessToken: { not: null } }, { refreshToken: { not: null } }],
    },
    select: {
      id: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      scope: true,
    },
  });
};

const hasCalendarAccess = (scope?: string | null) => {
  return Boolean(scope?.split(/\s+/).includes(CALENDAR_SCOPE));
};

const getCalendarClient = async (userId: string) => {
  const account = await getCalendarAccount(userId);

  if (!account || !hasCalendarAccess(account.scope)) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUrl(),
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken ?? null,
    refresh_token: account.refreshToken ?? null,
  });

  return {
    account,
    oauth2Client,
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
  };
};

const persistRefreshedTokens = async (
  accountId: string,
  credentials: { access_token?: string | null; refresh_token?: string | null },
) => {
  const data: { accessToken?: string; refreshToken?: string } = {};

  if (credentials.access_token) {
    data.accessToken = credentials.access_token;
  }

  if (credentials.refresh_token) {
    data.refreshToken = credentials.refresh_token;
  }

  if (Object.keys(data).length > 0) {
    await prisma.account.update({
      where: { id: accountId },
      data,
    });
  }
};

const createBookingCalendarEvent = async (bookingId: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        tutor: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        course: { select: { title: true } },
      },
    });

    if (!booking || booking.status !== "CONFIRMED") {
      return null;
    }

    if (booking.googleEventId) {
      return booking;
    }

    const calendarClient =
      (await getCalendarClient(booking.tutor.userId)) ??
      (await getCalendarClient(booking.studentId));

    if (!calendarClient) {
      return null;
    }

    const startDate = new Date(booking.dateTime);
    const endDate = new Date(
      startDate.getTime() + SESSION_DURATION_MINUTES * 60 * 1000,
    );
    const courseTitle = booking.course?.title ?? "MentorForge Session";

    const event = await calendarClient.calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: `${courseTitle} Session`,
        description: `MentorForge tutor booking session.\n\nStudent: ${booking.student.name}\nTutor: ${booking.tutor.user.name}`,
        start: {
          dateTime: startDate.toISOString(),
        },
        end: {
          dateTime: endDate.toISOString(),
        },
        attendees: [
          { email: booking.student.email, displayName: booking.student.name },
          {
            email: booking.tutor.user.email,
            displayName: booking.tutor.user.name,
          },
        ],
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 1440 },
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
      },
    });

    await persistRefreshedTokens(
      calendarClient.account.id,
      calendarClient.oauth2Client.credentials,
    );

    return prisma.booking.update({
      where: { id: booking.id },
      data: {
        googleEventId: event.data.id ?? null,
        googleEventCreatorUserId: calendarClient.account.userId,
        meetingLink: event.data.hangoutLink ?? null,
      },
    });
  } catch (error) {
    logger.error("Failed to create Google Calendar event", error, { bookingId });
    return null;
  }
};

const deleteBookingCalendarEvent = async (bookingId: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        googleEventId: true,
        googleEventCreatorUserId: true,
      },
    });

    if (!booking?.googleEventId || !booking.googleEventCreatorUserId) {
      return null;
    }

    const calendarClient = await getCalendarClient(
      booking.googleEventCreatorUserId,
    );

    if (!calendarClient) {
      return null;
    }

    await calendarClient.calendar.events.delete({
      calendarId: "primary",
      eventId: booking.googleEventId,
      sendUpdates: "all",
    });

    await persistRefreshedTokens(
      calendarClient.account.id,
      calendarClient.oauth2Client.credentials,
    );

    return prisma.booking.update({
      where: { id: booking.id },
      data: {
        googleEventId: null,
        googleEventCreatorUserId: null,
        meetingLink: null,
      },
    });
  } catch (error) {
    logger.error("Failed to delete Google Calendar event", error, { bookingId });
    return null;
  }
};

export const GoogleCalendarService = {
  createBookingCalendarEvent,
  deleteBookingCalendarEvent,
};
