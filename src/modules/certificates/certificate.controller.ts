import { Request, Response } from "express";
import { getHttpStatusFromMessage } from "../../utils/httpStatus";
import { CertificateService } from "./certificate.service";

const getCertificates = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new Error("Unauthorized");
    }

    const result = await CertificateService.getCertificates(userId, role);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const getCertificateByCourse = async (req: Request, res: Response) => {
  try {
    const rawCourseId = req.params.courseId;
    const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;
    const userId = req.user?.id;

    if (!courseId || !userId) {
      throw new Error("Unauthorized or invalid request");
    }

    const result = await CertificateService.getCertificateByCourse(
      userId,
      courseId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const rawCertificateNo = req.params.certificateNo;
    const certificateNo = Array.isArray(rawCertificateNo)
      ? rawCertificateNo[0]
      : rawCertificateNo;

    if (!certificateNo) {
      throw new Error("Invalid certificate number");
    }

    const certificate =
      await CertificateService.getCertificateByNumber(certificateNo);

    res.status(200).json({
      success: true,
      message: "Certificate verified",
      data: {
        id: certificate.id,
        certificateNo: certificate.certificateNo,
        issuedAt: certificate.issuedAt,
        student: certificate.student,
        course: certificate.course,
      },
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const downloadCertificate = async (req: Request, res: Response) => {
  try {
    const rawCertificateId = req.params.id;
    const certificateId = Array.isArray(rawCertificateId)
      ? rawCertificateId[0]
      : rawCertificateId;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!certificateId || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }

    const certificate = await CertificateService.createCertificatePdf(
      certificateId,
      userId,
      role,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${certificate.filename}"`,
    );
    res.status(200).send(certificate.buffer);
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

export const CertificateController = {
  getCertificates,
  getCertificateByCourse,
  verifyCertificate,
  downloadCertificate,
};
