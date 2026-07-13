import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { renderCertificatePdf } from "./certificate.template";

const certificateInclude = {
  student: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  course: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      tutor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
} as const;

const getFrontendUrl = () => process.env.APP_URL || "http://localhost:3000";

const buildVerificationUrl = (certificateNo: string) =>
  `${getFrontendUrl()}/certificate/${encodeURIComponent(certificateNo)}`;

const createCertificateNo = () =>
  `MENTORFORGE-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

const issueCertificate = async (studentId: string, courseId: string) => {
  const existing = await prisma.certificate.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
    include: certificateInclude,
  });

  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.certificate.create({
        data: {
          studentId,
          courseId,
          certificateNo: createCertificateNo(),
        },
        include: certificateInclude,
      });
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }

  throw new Error("Could not generate a unique certificate number");
};

const issueForCompletedBooking = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      studentId: true,
      courseId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "COMPLETED") {
    throw new Error("Certificate can only be issued for completed bookings");
  }

  if (!booking.courseId) {
    throw new Error("This booking has no course assigned");
  }

  return issueCertificate(booking.studentId, booking.courseId);
};

const getCertificateByCourse = async (studentId: string, courseId: string) => {
  const certificate = await prisma.certificate.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
    include: certificateInclude,
  });

  if (certificate) {
    return certificate;
  }

  const completedBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      courseId,
      status: "COMPLETED",
    },
    select: { id: true },
  });

  if (!completedBooking) {
    throw new Error("Complete this course before downloading a certificate");
  }

  return issueCertificate(studentId, courseId);
};

const getCertificateById = async (id: string, userId?: string, role?: string) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: certificateInclude,
  });

  if (!certificate) {
    throw new Error("Certificate not found");
  }

  if (role === "STUDENT" && certificate.studentId !== userId) {
    throw new Error("Unauthorized");
  }

  if (role === "TUTOR" && certificate.course.tutorId !== userId) {
    throw new Error("Unauthorized");
  }

  return certificate;
};

const getCertificateByNumber = async (certificateNo: string) => {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNo },
    include: certificateInclude,
  });

  if (!certificate) {
    throw new Error("Certificate not found");
  }

  return certificate;
};

const getCertificates = async (userId: string, role: string) => {
  if (role === "ADMIN") {
    return prisma.certificate.findMany({
      include: certificateInclude,
      orderBy: { issuedAt: "desc" },
    });
  }

  if (role === "TUTOR") {
    return prisma.certificate.findMany({
      where: {
        course: {
          tutorId: userId,
        },
      },
      include: certificateInclude,
      orderBy: { issuedAt: "desc" },
    });
  }

  return prisma.certificate.findMany({
    where: { studentId: userId },
    include: certificateInclude,
    orderBy: { issuedAt: "desc" },
  });
};

const createCertificatePdf = async (
  certificateId: string,
  userId?: string,
  role?: string,
) => {
  const certificate = await getCertificateById(certificateId, userId, role);
  const buffer = renderCertificatePdf({
    certificateNo: certificate.certificateNo,
    issuedAt: certificate.issuedAt,
    verificationUrl: buildVerificationUrl(certificate.certificateNo),
    student: {
      name: certificate.student.name,
    },
    course: {
      title: certificate.course.title,
      tutor: {
        name: certificate.course.tutor?.name ?? null,
      },
      category: certificate.course.category,
    },
  });

  return {
    filename: `mentorforge-certificate-${certificate.certificateNo}.pdf`,
    buffer,
  };
};

export const CertificateService = {
  issueCertificate,
  issueForCompletedBooking,
  getCertificateByCourse,
  getCertificateById,
  getCertificateByNumber,
  getCertificates,
  createCertificatePdf,
  buildVerificationUrl,
};
