import { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { PaymentController } from "./payment.controller";

const router = Router();

router.post("/initiate", auth(UserRole.STUDENT), PaymentController.initiatePayment);
router.get("/", auth(), PaymentController.getPaymentHistory);
router.get("/:id/invoice", auth(), PaymentController.downloadInvoice);
router.get("/success", PaymentController.paymentSuccess);
router.get("/cancel", PaymentController.paymentCancel);

export const paymentRouter = router;
