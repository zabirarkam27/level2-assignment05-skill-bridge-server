import { Request, Response } from "express";
import { TutorService, TutorFilters } from "./tutor.service";
import { ReviewService } from "../reviews/review.service";
import { AvailabilityService } from "../availability/availability.service";

const getTutorProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const result = await TutorService.getTutorProfileByUserId(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getTutorReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ReviewService.getTutorReviews(id as string);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getTutorAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await AvailabilityService.getPublicTutorAvailability(id as string);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const result = await TutorService.createTutor(userId!, req.body);

    res.status(201).json({
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

const updateTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const result = await TutorService.updateTutor(userId!, req.body);

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

const getAllTutors = async (req: Request, res: Response) => {
  try {
    const { search, minPrice, maxPrice, minRating, categoryId } = req.query;
    const filters: TutorFilters = {};
    if (search) filters.search = search as string;
    if (minPrice) filters.minPrice = Number(minPrice);
    if (maxPrice) filters.maxPrice = Number(maxPrice);
    if (minRating) filters.minRating = Number(minRating);
    if (categoryId) filters.categoryId = categoryId as string;
    const result = await TutorService.getAllTutors(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getSingleTutor = async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await TutorService.getSingleTutor(id as string);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const TutorController = {
  getTutorProfile,
  getTutorReviews,
  getTutorAvailability,
  createTutor,
  updateTutor,
  getAllTutors,
  getSingleTutor,
};
