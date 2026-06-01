import { Router } from "express";
import auth from "../../middlewares/auth";
import { CertificateController } from "./certificate.controller";

const router = Router();

router.get("/", auth(), CertificateController.getCertificates);
router.get("/verify/:certificateNo", CertificateController.verifyCertificate);
router.get("/:id/download", auth(), CertificateController.downloadCertificate);
router.get("/:courseId", auth(), CertificateController.getCertificateByCourse);

export const certificateRouter = router;
