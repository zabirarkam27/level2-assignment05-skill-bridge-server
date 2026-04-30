import { Request, Response } from "express";
import { UserService } from "./user.service";
import { updateProfileSchema } from "./user.validation";

const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await UserService.getCurrentUser(userId);

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

const updateProfile = async (req: Request, res: Response) => {
  try {
    const parsed = updateProfileSchema.parse(req.body);
    const userId = req.user!.id;
    const result = await UserService.updateProfile(userId, parsed);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const UserController = {
  getCurrentUser,
  updateProfile,
};