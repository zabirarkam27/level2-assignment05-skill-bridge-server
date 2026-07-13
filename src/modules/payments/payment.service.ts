import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { BookingService } from "../bookings/booking.service";
import { InitiatePaymentPayload } from "./payment.validation";
import { renderInvoicePdf } from "./invoice.template";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const getApiBaseUrl = () =>
  process.env.API_PUBLIC_URL ||
  process.env.BETTER_AUTH_URL ||
  "http://localhost:5000";

const getFrontendUrl = () => process.env.APP_URL || "http://localhost:3000";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe secret key is not configured");
  }

  return new Stripe(secretKey);
};

const getCurrency = () =>
  (process.env.STRIPE_CURRENCY || "bdt").trim().toLowerCase();

const toStripeUnitAmount = (amount: number, currency: string) =>
  ZERO_DECIMAL_CURRENCIES.has(currency) ? amount : amount * 100;

const buildTransactionId = () =>
  `SB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

const initiatePayment = async (
  studentId: string,
  payload: InitiatePaymentPayload,
) => {
  const stripe = getStripe();
  const currency = getCurrency();
  const { tutor, course, amount } = await BookingService.validateBookingRequest(
    studentId,
    payload,
  );
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, email: true },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const transactionId = buildTransactionId();
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      gateway: "STRIPE",
      amount,
      currency,
      studentId,
      tutorId: payload.tutorId,
      courseId: payload.courseId,
      availabilityId: payload.availabilityId,
      date: payload.date,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: student.email,
    success_url: `${getApiBaseUrl()}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getApiBaseUrl()}/payments/cancel?payment_id=${payment.id}`,
    metadata: {
      paymentId: payment.id,
      transactionId,
      studentId,
      tutorProfileId: payload.tutorId,
      tutorUserId: tutor.userId,
      courseId: payload.courseId,
      availabilityId: payload.availabilityId,
      date: payload.date,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toStripeUnitAmount(amount, currency),
          product_data: {
            name: course.title,
            description: `MentorForge session with ${tutor.user?.name ?? "Tutor"}`,
          },
        },
      },
    ],
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayTransactionId: session.id,
      gatewayPayload: session as unknown as Prisma.InputJsonValue,
    },
  });

  if (!session.url) {
    throw new Error("Stripe checkout URL was not returned");
  }

  return {
    transactionId,
    amount,
    currency,
    paymentUrl: session.url,
    cancelUrl: `${getFrontendUrl()}/dashboard/bookings?payment=cancelled`,
  };
};

const createBookingAfterPayment = async (sessionId: string) => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    throw new Error("Stripe payment is not completed");
  }

  const paymentId = session.metadata?.paymentId;
  if (!paymentId) {
    throw new Error("Payment record not found in Stripe metadata");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (payment.status === "PAID" && payment.bookingId) {
    return await prisma.booking.findUnique({ where: { id: payment.bookingId } });
  }

  if (payment.status === "CANCELLED") {
    throw new Error("Payment was cancelled");
  }

  if (payment.status === "FAILED") {
    throw new Error("Payment failed");
  }

  const payload = {
    tutorId: payment.tutorId,
    courseId: payment.courseId,
    availabilityId: payment.availabilityId,
    date: payment.date,
  };
  const { bookingDate } = await BookingService.validateBookingRequest(
    payment.studentId,
    payload,
  );

  const booking = await prisma.$transaction(
    async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id: payment.id },
      });

      if (existingPayment?.bookingId) {
        return await tx.booking.findUnique({
          where: { id: existingPayment.bookingId },
        });
      }

      const conflicting = await tx.booking.findFirst({
        where: {
          tutorId: payment.tutorId,
          dateTime: bookingDate,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      if (conflicting) {
        throw new Error("This time slot is already booked");
      }

      const booking = await tx.booking.create({
        data: {
          studentId: payment.studentId,
          tutorId: payment.tutorId,
          courseId: payment.courseId,
          dateTime: bookingDate,
          status: "PENDING",
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          bookingId: booking.id,
          gatewayTransactionId: session.id,
          validationId: session.payment_intent?.toString() ?? null,
          gatewayPayload: session as unknown as Prisma.InputJsonValue,
        },
      });

      return booking;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (booking?.id) {
    await BookingService.notifyBookingCreated(booking.id);
  }

  return booking;
};

const markPaymentCancelled = async (paymentId?: string) => {
  if (!paymentId) return null;

  return await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: "INITIATED",
    },
    data: { status: "CANCELLED" },
  });
};

type PaymentScope = {
  userId: string;
  role: string;
};

const buildPaymentWhere = async ({ userId, role }: PaymentScope) => {
  if (role === "ADMIN") return {};
  if (role === "STUDENT") return { studentId: userId };
  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutorProfile) {
      throw new Error("Tutor profile not found");
    }

    return { tutorId: tutorProfile.id };
  }

  throw new Error("Unauthorized");
};

const enrichPayments = async (payments: Awaited<ReturnType<typeof prisma.payment.findMany>>) => {
  const studentIds = Array.from(new Set(payments.map((item) => item.studentId)));
  const tutorIds = Array.from(new Set(payments.map((item) => item.tutorId)));
  const courseIds = Array.from(new Set(payments.map((item) => item.courseId)));
  const bookingIds = Array.from(
    new Set(payments.map((item) => item.bookingId).filter(Boolean) as string[]),
  );

  const [students, tutors, courses, bookings] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.tutorProfile.findMany({
      where: { id: { in: tutorIds } },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.course.findMany({
      where: { id: { in: courseIds } },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, status: true, dateTime: true },
    }),
  ]);

  const studentMap = new Map(students.map((item) => [item.id, item]));
  const tutorMap = new Map(tutors.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  const bookingMap = new Map(bookings.map((item) => [item.id, item]));

  return payments.map((payment) => ({
    ...payment,
    student: studentMap.get(payment.studentId) ?? null,
    tutor: tutorMap.get(payment.tutorId) ?? null,
    course: courseMap.get(payment.courseId) ?? null,
    booking: payment.bookingId ? bookingMap.get(payment.bookingId) ?? null : null,
  }));
};

const getPaymentHistory = async (scope: PaymentScope) => {
  const where = await buildPaymentWhere(scope);
  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return await enrichPayments(payments);
};

const getPaymentForInvoice = async (
  paymentId: string,
  userId: string,
  role: string,
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (role === "STUDENT" && payment.studentId !== userId) {
    throw new Error("Unauthorized");
  }

  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutorProfile || tutorProfile.id !== payment.tutorId) {
      throw new Error("Unauthorized");
    }
  }

  const [enriched] = await enrichPayments([payment]);
  if (!enriched) {
    throw new Error("Payment not found");
  }

  return enriched;
};

const createInvoicePdf = async (
  paymentId: string,
  userId: string,
  role: string,
) => {
  const payment = await getPaymentForInvoice(paymentId, userId, role);

  return {
    filename: `mentorforge-invoice-${payment.transactionId}.pdf`,
    buffer: renderInvoicePdf(payment),
  };
};

export const PaymentService = {
  initiatePayment,
  createBookingAfterPayment,
  markPaymentCancelled,
  getPaymentHistory,
  createInvoicePdf,
};
