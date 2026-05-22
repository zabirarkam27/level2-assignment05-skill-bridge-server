import { Request, Response } from "express";
import { CourseService } from "./course.service";
import {
  createCourseSchema,
  togglePopularSchema,
  updateCourseSchema,
} from "./course.validation";

const getAllCourses = async (req: Request, res: Response) => {
  try {
    const popular = req.query.popular === "true";
    const categoryId = req.query.categoryId as string | undefined;
    const mine = req.query.mine === "true";

    if (mine && !req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const filters: Parameters<typeof CourseService.getAllCourses>[0] = {
      ...(popular && { popular: true }),
      ...(categoryId && { categoryId }),
      ...(mine &&
        req.user?.id &&
        req.user?.role && { mineUserId: req.user.id, mineRole: req.user.role }),
    };

    const result = await CourseService.getAllCourses(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getPopularCourses = async (req: Request, res: Response) => {
  try {
    const result = await CourseService.getAllCourses({ popular: true });
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getSingleCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await CourseService.getSingleCourse(id as string);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const status = error.message === "Course not found" ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

const createCourse = async (req: Request, res: Response) => {
  try {
    const parsed = createCourseSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const role = req.user?.role;
    if (!role) throw new Error("Unauthorized");

    const result = await CourseService.createCourse(userId, role, parsed);
    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateCourseSchema.parse(req.body);
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");

    const result = await CourseService.updateCourse(
      id as string,
      userId,
      role,
      parsed,
    );
    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");

    const result = await CourseService.deleteCourse(id as string, userId, role);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const requestCourseDelete = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");

    const result = await CourseService.requestCourseDelete(
      id as string,
      userId,
      role,
    );

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getDeleteRequests = async (_req: Request, res: Response) => {
  try {
    const result = await CourseService.getDeleteRequests();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const resolveDeleteRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const action = req.body?.action;

    if (!adminId) throw new Error("Unauthorized");
    if (action !== "APPROVED" && action !== "REJECTED") {
      throw new Error("Invalid action");
    }

    const result = await CourseService.resolveDeleteRequest(
      id as string,
      adminId,
      action,
    );

    res.status(200).json({
      success: true,
      message:
        action === "APPROVED"
          ? "Course delete request approved"
          : "Course delete request rejected",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const togglePopular = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPopular } = togglePopularSchema.parse(req.body);
    const result = await CourseService.togglePopular(id as string, isPopular);
    res.status(200).json({
      success: true,
      message: isPopular
        ? "Course marked as popular"
        : "Course removed from popular",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const CourseController = {
  getAllCourses,
  getPopularCourses,
  getSingleCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  requestCourseDelete,
  getDeleteRequests,
  resolveDeleteRequest,
  togglePopular,
};
