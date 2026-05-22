import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { makeTutorSchema, createTutorSchema } from "./admin.validation";
import { getHttpStatusFromMessage } from "../../utils/httpStatus";

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await AdminService.getAllUsers();
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

const getSingleUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AdminService.getSingleUser(id as string);
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

const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["ACTIVE", "BANNED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or BANNED",
      });
    }

    const result = await AdminService.updateUserStatus(id as string, status as "ACTIVE" | "BANNED");
    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllBookings = async (req: Request, res: Response) => {
  try {
    const result = await AdminService.getAllBookings();
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

const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const result = await AdminService.getDashboardStats();
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

const makeTutor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = makeTutorSchema.parse(req.body);
    const result = await AdminService.makeTutor(id as string, validatedData);
    res.status(200).json({
      success: true,
      message: "User promoted to tutor successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const undoTutor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AdminService.undoTutor(id as string);
    res.status(200).json({
      success: true,
      message: "Tutor changed back to student successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const createTutor = async (req: Request, res: Response) => {
  try {
    const validatedData = createTutorSchema.parse(req.body);
    const { name, email, bio, subjects, price } = validatedData;
    const result = await AdminService.createTutor({ name, email }, { bio, subjects, price });
    res.status(201).json({
      success: true,
      message: "Tutor created successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const getPendingTutors = async (req: Request, res: Response) => {
  try {
    const result = await AdminService.getPendingTutors();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};

const approveTutor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AdminService.approveTutor(id as string);
    res.status(200).json({ success: true, message: "Tutor approved successfully", data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};

const rejectTutor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AdminService.rejectTutor(id as string);
    res.status(200).json({ success: true, message: "Tutor application rejected", data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AdminService.deleteUser(id as string);
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

export const AdminController = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  getAllBookings,
  getDashboardStats,
  makeTutor,
  undoTutor,
  createTutor,
  deleteUser,
  getPendingTutors,
  approveTutor,
  rejectTutor,
};
