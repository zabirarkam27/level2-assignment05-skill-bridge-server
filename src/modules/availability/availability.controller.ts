import { Request, Response } from "express";
import { AvailabilityService } from "./availability.service";
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  bulkUpdateAvailabilitySchema,
} from "./availability.validation";

const createAvailability = async (req: Request, res: Response) => {
  try {
    const parsed = createAvailabilitySchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await AvailabilityService.createAvailability(userId, parsed);

    res.status(201).json({
      success: true,
      message: "Availability created successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getTutorAvailability = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await AvailabilityService.getTutorAvailability(userId);

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

const updateAvailability = async (req: Request, res: Response) => {
  try {
    const parsed = bulkUpdateAvailabilitySchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await AvailabilityService.bulkUpdateAvailability(userId, parsed.slots);

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await AvailabilityService.deleteAvailability(userId, id as string);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getPublicTutorAvailability = async (req: Request, res: Response) => {
  try {
    const { tutorId } = req.params;
    const result = await AvailabilityService.getPublicTutorAvailability(tutorId as string);

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

export const AvailabilityController = {
  createAvailability,
  getTutorAvailability,
  updateAvailability,
  deleteAvailability,
  getPublicTutorAvailability,
};