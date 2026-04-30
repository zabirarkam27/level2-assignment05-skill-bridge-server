import { Request, Response } from "express";
import { BookingService } from "./booking.service";
import { createBookingSchema, updateBookingStatusSchema } from "./booking.validation";

const createBooking = async (req: Request, res: Response) => {
  try {
    const parsed = createBookingSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("Unauthorized");
    }

    const result = await BookingService.createBooking(userId, parsed);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new Error("Unauthorized");
    }

    let result;
    if (role === "TUTOR") {
      result = await BookingService.getTutorBookings(userId);
    } else {
      result = await BookingService.getStudentBookings(userId);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getSingleBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!id || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }

    const result = await BookingService.getSingleBooking(id as string, userId, role);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateBookingStatusSchema.parse(req.body);
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!id || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }

    const result = await BookingService.updateBookingStatus(id as string, userId as string, role as string, parsed.status);

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const completeBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bookingId = Array.isArray(id) ? id[0] : id;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!bookingId || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }

    const result = await BookingService.updateBookingStatus(bookingId, userId, role, "COMPLETED");

    res.status(200).json({
      success: true,
      message: "Session marked as completed",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const BookingController = {
  createBooking,
  getUserBookings,
  getSingleBooking,
  updateBookingStatus,
  completeBooking,
};