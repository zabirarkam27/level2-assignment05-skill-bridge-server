import { prisma } from "../../lib/prisma";
import { CreateBlogPayload, UpdateBlogPayload } from "./blog.validation";

const blogInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  },
} as const;

const buildCreateData = (payload: CreateBlogPayload, authorId: string) => ({
  title: payload.title,
  excerpt: payload.excerpt,
  content: payload.content,
  image: payload.image || null,
  tags: payload.tags ?? [],
  isPublished: payload.isPublished ?? true,
  authorId,
});

const buildUpdateData = (payload: UpdateBlogPayload) => ({
  ...(payload.title !== undefined && { title: payload.title }),
  ...(payload.excerpt !== undefined && { excerpt: payload.excerpt }),
  ...(payload.content !== undefined && { content: payload.content }),
  ...(payload.image !== undefined && { image: payload.image || null }),
  ...(payload.tags !== undefined && { tags: payload.tags }),
  ...(payload.isPublished !== undefined && { isPublished: payload.isPublished }),
});

const getPublishedBlogs = async () => {
  return prisma.blogPost.findMany({
    where: { isPublished: true },
    include: blogInclude,
    orderBy: { createdAt: "desc" },
  });
};

const getSinglePublishedBlog = async (id: string) => {
  const blog = await prisma.blogPost.findFirst({
    where: { id, isPublished: true },
    include: blogInclude,
  });

  if (!blog) throw new Error("Blog not found");
  return blog;
};

const getManageBlogs = async (userId: string, role: string) => {
  return prisma.blogPost.findMany({
    where: role === "ADMIN" ? {} : { authorId: userId },
    include: blogInclude,
    orderBy: { createdAt: "desc" },
  });
};

const createBlog = async (
  authorId: string,
  payload: CreateBlogPayload,
) => {
  return prisma.blogPost.create({
    data: buildCreateData(payload, authorId),
    include: blogInclude,
  });
};

const updateBlog = async (
  id: string,
  userId: string,
  role: string,
  payload: UpdateBlogPayload,
) => {
  const blog = await prisma.blogPost.findUnique({ where: { id } });
  if (!blog) throw new Error("Blog not found");
  if (role !== "ADMIN" && blog.authorId !== userId) {
    throw new Error("You can only edit your own blog posts");
  }

  return prisma.blogPost.update({
    where: { id },
    data: buildUpdateData(payload),
    include: blogInclude,
  });
};

const deleteBlog = async (id: string, userId: string, role: string) => {
  const blog = await prisma.blogPost.findUnique({ where: { id } });
  if (!blog) throw new Error("Blog not found");
  if (role !== "ADMIN" && blog.authorId !== userId) {
    throw new Error("You can only delete your own blog posts");
  }

  await prisma.blogPost.delete({ where: { id } });
  return { message: "Blog deleted successfully" };
};

export const BlogService = {
  getPublishedBlogs,
  getSinglePublishedBlog,
  getManageBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
};
