import { Request, Response } from "express";
import { getHttpStatusFromMessage } from "../../utils/httpStatus";
import { WishlistService } from "./wishlist.service";

const getUserId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
};

const getParam = (req: Request, key: string) => {
  const raw = req.params[key];
  return Array.isArray(raw) ? raw[0] : raw;
};

const getWishlist = async (req: Request, res: Response) => {
  try {
    const result = await WishlistService.getWishlist(getUserId(req));
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const addCourse = async (req: Request, res: Response) => {
  try {
    const courseId = getParam(req, "courseId");
    if (!courseId) throw new Error("Invalid course id");
    const result = await WishlistService.addCourse(getUserId(req), courseId);
    res.status(201).json({
      success: true,
      message: "Course added to wishlist",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const addTutor = async (req: Request, res: Response) => {
  try {
    const tutorId = getParam(req, "tutorId");
    if (!tutorId) throw new Error("Invalid tutor id");
    const result = await WishlistService.addTutor(getUserId(req), tutorId);
    res.status(201).json({
      success: true,
      message: "Tutor added to wishlist",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const removeCourse = async (req: Request, res: Response) => {
  try {
    const courseId = getParam(req, "courseId");
    if (!courseId) throw new Error("Invalid course id");
    const result = await WishlistService.removeCourse(getUserId(req), courseId);
    res.status(200).json({
      success: true,
      message: "Course removed from wishlist",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

const removeTutor = async (req: Request, res: Response) => {
  try {
    const tutorId = getParam(req, "tutorId");
    if (!tutorId) throw new Error("Invalid tutor id");
    const result = await WishlistService.removeTutor(getUserId(req), tutorId);
    res.status(200).json({
      success: true,
      message: "Tutor removed from wishlist",
      data: result,
    });
  } catch (error: any) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message,
    });
  }
};

export const WishlistController = {
  getWishlist,
  addCourse,
  addTutor,
  removeCourse,
  removeTutor,
};
