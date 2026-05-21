import { Request, Response } from "express";
import { CategoryService } from "./category.service";
import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";
import { ImageUploadService } from "../../lib/image";

const createCategory = async (req: Request, res: Response) => {
  try {
    const validatedData = createCategorySchema.parse(req.body);

    const cleanData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined),
    ) as unknown as Parameters<typeof CategoryService.createCategory>[0];

    const result = await CategoryService.createCategory(cleanData);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const uploadCategoryImage = async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { url } = req.body;

    const result = file
      ? await ImageUploadService.fromMulterFile(file, "category")
      : url
        ? await ImageUploadService.fromUrl(url, "category")
        : null;

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Provide an image file or URL",
      });
    }

    res.status(200).json({
      success: true,
      message: "Image optimized and uploaded",
      data: result,
      url: result.url,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Image upload failed";
    res.status(400).json({ success: false, message });
  }
};

const getAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await CategoryService.getAllCategories();

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

const getSingleCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const result = await CategoryService.getSingleCategory(id);

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

const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const validatedData = updateCategorySchema.parse(req.body);
    const cleanData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== undefined),
    );

    const result = await CategoryService.updateCategory(id, cleanData);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await CategoryService.deleteCategory(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
};
