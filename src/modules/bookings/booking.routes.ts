import express, { Router } from "express";
import auth, { UserRole } from "../../middlewares/auth";
import { BookingController } from "./booking.controller";

const router: Router = express.Router();

router.post("/", auth(UserRole.STUDENT), BookingController.createBooking);
router.get("/", auth(), BookingController.getUserBookings);
router.get("/:id", auth(), BookingController.getSingleBooking);
router.patch("/:id/status", auth(), BookingController.updateBookingStatus);

export const bookingRouter = router;