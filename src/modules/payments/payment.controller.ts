import { Request, Response } from "express";
import { getHttpStatusFromMessage } from "../../utils/httpStatus";
import { PaymentService } from "./payment.service";
import {
  initiatePaymentSchema,
  stripeCancelSchema,
  stripeSuccessSchema,
} from "./payment.validation";

const getFrontendUrl = () => process.env.APP_URL || "http://localhost:3000";

const initiatePayment = async (req: Request, res: Response) => {
  try {
    const parsed = initiatePaymentSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("Unauthorized");
    }

    const result = await PaymentService.initiatePayment(userId, parsed);

    res.status(201).json({
      success: true,
      message: "Payment session created. Redirect the student to payment.",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const paymentSuccess = async (req: Request, res: Response) => {
  const frontendUrl = getFrontendUrl();

  try {
    const parsed = stripeSuccessSchema.parse(req.query);
    const booking = await PaymentService.createBookingAfterPayment(parsed.session_id);

    res.redirect(
      `${frontendUrl}/dashboard/bookings?payment=success&bookingId=${booking?.id ?? ""}`,
    );
  } catch (error: any) {
    res.redirect(
      `${frontendUrl}/dashboard/bookings?payment=failed&message=${encodeURIComponent(
        error.message || "Payment failed",
      )}`,
    );
  }
};

const paymentCancel = async (req: Request, res: Response) => {
  try {
    const parsed = stripeCancelSchema.parse(req.query);
    await PaymentService.markPaymentCancelled(parsed.payment_id);

    res.redirect(`${getFrontendUrl()}/dashboard/bookings?payment=cancelled`);
  } catch (error: any) {
    res.redirect(
      `${getFrontendUrl()}/dashboard/bookings?payment=failed&message=${encodeURIComponent(
        error.message || "Payment cancellation failed",
      )}`,
    );
  }
};

const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new Error("Unauthorized");
    }

    const result = await PaymentService.getPaymentHistory({ userId, role });

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

const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!id || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }

    const invoice = await PaymentService.createInvoicePdf(id, userId, role);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.filename}"`,
    );
    res.status(200).send(invoice.buffer);
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

export const PaymentController = {
  initiatePayment,
  paymentSuccess,
  paymentCancel,
  getPaymentHistory,
  downloadInvoice,
};
