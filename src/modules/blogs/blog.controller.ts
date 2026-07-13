import { Request, Response } from "express";
import { BlogService } from "./blog.service";
import { createBlogSchema, updateBlogSchema } from "./blog.validation";

const getPublishedBlogs = async (_req: Request, res: Response) => {
  try {
    const result = await BlogService.getPublishedBlogs();
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load blogs";
    res.status(400).json({ success: false, message });
  }
};

const getSinglePublishedBlog = async (req: Request, res: Response) => {
  try {
    const result = await BlogService.getSinglePublishedBlog(req.params.id as string);
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Blog not found";
    res.status(message === "Blog not found" ? 404 : 400).json({ success: false, message });
  }
};

const getManageBlogs = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id || !req.user.role) throw new Error("Unauthorized");
    const result = await BlogService.getManageBlogs(req.user.id, req.user.role);
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load blogs";
    res.status(400).json({ success: false, message });
  }
};

const createBlog = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) throw new Error("Unauthorized");
    const payload = createBlogSchema.parse(req.body);
    const result = await BlogService.createBlog(req.user.id, payload);
    res.status(201).json({
      success: true,
      message: "Blog published successfully",
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to publish blog";
    res.status(400).json({ success: false, message });
  }
};

const updateBlog = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id || !req.user.role) throw new Error("Unauthorized");
    const payload = updateBlogSchema.parse(req.body);
    const result = await BlogService.updateBlog(
      req.params.id as string,
      req.user.id,
      req.user.role,
      payload,
    );
    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update blog";
    res.status(400).json({ success: false, message });
  }
};

const deleteBlog = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id || !req.user.role) throw new Error("Unauthorized");
    const result = await BlogService.deleteBlog(
      req.params.id as string,
      req.user.id,
      req.user.role,
    );
    res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete blog";
    res.status(400).json({ success: false, message });
  }
};

export const BlogController = {
  getPublishedBlogs,
  getSinglePublishedBlog,
  getManageBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
