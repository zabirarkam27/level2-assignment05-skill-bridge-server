// src/app.ts
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// src/lib/prisma.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();

// src/lib/auth.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.APP_USER,
    pass: process.env.APP_PASSWORD
  }
});
var authBaseUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";
var appUrl = process.env.APP_URL || "http://localhost:3000";
var isHttpsAuthUrl = authBaseUrl.startsWith("https://");
var auth = betterAuth({
  baseURL: authBaseUrl,
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  trustedOrigins: Array.from(
    /* @__PURE__ */ new Set([
      appUrl,
      authBaseUrl,
      "http://localhost:3000",
      "http://localhost:5000",
      "https://skill-bridge-client-two-beta.vercel.app",
      "https://skill-bridge-server-tan.vercel.app"
    ])
  ),
  advanced: {
    useSecureCookies: isHttpsAuthUrl,
    defaultCookieAttributes: {
      sameSite: isHttpsAuthUrl ? "none" : "lax",
      secure: isHttpsAuthUrl,
      httpOnly: true,
      path: "/"
    }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "STUDENT",
        required: false
      },
      phone: {
        type: "string",
        required: false
      },
      status: {
        type: "string",
        defaultValue: "ACTIVE",
        required: false
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          if (userData.role === "TUTOR") {
            return { data: { ...userData, status: "PENDING" } };
          }
        }
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await transporter.sendMail({
          from: '"Skill Bridge" <skillbridge.noreply@gmail.com>',
          to: user.email,
          subject: "Reset your password",
          html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Reset your password \u2013 Skill Bridge</title>
                <style>
                  body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
                  .header { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; text-align: center; padding: 30px 20px; }
                  .header h1 { margin: 0; font-size: 28px; letter-spacing: 0.5px; }
                  .header p { margin-top: 8px; font-size: 14px; opacity: 0.9; }
                  .content { padding: 32px; color: #374151; line-height: 1.7; font-size: 15px; }
                  .content h2 { color: #111827; font-size: 22px; margin-bottom: 12px; }
                  .button-wrapper { text-align: center; margin: 28px 0; }
                  .button { display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
                  .link-box { background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; padding: 14px; font-size: 13px; word-break: break-all; color: #4f46e5; }
                  .footer { background-color: #f9fafb; text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
                  .footer strong { color: #374151; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Skill Bridge</h1>
                    <p>Connect with expert tutors, learn anything</p>
                  </div>
                  <div class="content">
                    <h2>Reset your password</h2>
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>We received a request to reset your password. Click the button below to set a new one:</p>
                    <div class="button-wrapper">
                      <a href="${url}" class="button">Reset Password</a>
                    </div>
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <div class="link-box">${url}</div>
                    <p style="margin-top: 24px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    <p>Stay secure,<br /><strong>Skill Bridge Team</strong></p>
                  </div>
                  <div class="footer">\xA9 2026 <strong>Skill Bridge</strong>. All rights reserved.<br />Learn. Grow. Succeed.</div>
                </div>
              </body>
            </html>`
        });
      } catch (error) {
        throw error;
      }
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      try {
        const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
        await transporter.sendMail({
          from: '"Skill Bridge" <skillbridge.noreply@gmail.com>',
          to: user.email,
          subject: "Verify your email address",
          html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Verify your email \u2013 Skill Bridge</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    background-color: #f3f4f6;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                      Roboto, Helvetica, Arial, sans-serif;
                  }

                  .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
                  }

                  .header {
                    background: linear-gradient(135deg, #4f46e5, #6366f1);
                    color: #ffffff;
                    text-align: center;
                    padding: 30px 20px;
                  }

                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                    letter-spacing: 0.5px;
                  }

                  .header p {
                    margin-top: 8px;
                    font-size: 14px;
                    opacity: 0.9;
                  }

                  .content {
                    padding: 32px;
                    color: #374151;
                    line-height: 1.7;
                    font-size: 15px;
                  }

                  .content h2 {
                    color: #111827;
                    font-size: 22px;
                    margin-bottom: 12px;
                  }
                  .button-wrapper {
                    text-align: center;
                    margin: 28px 0;
                  }

                  .button {
                    display: inline-block;
                    padding: 14px 28px;
                    background-color: #4f46e5;
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                  }

                  .button:hover {
                    background-color: #4338ca;
                  }

                  .link-box {
                    background-color: #f9fafb;
                    border: 1px dashed #d1d5db;
                    border-radius: 6px;
                    padding: 14px;
                    font-size: 13px;
                    word-break: break-all;
                    color: #4f46e5;
                  }

                  .footer {
                    background-color: #f9fafb;
                    text-align: center;
                    padding: 20px;
                    font-size: 12px;
                    color: #6b7280;
                  }

                  .footer strong {
                    color: #374151;
                  }
                </style>
              </head>

              <body>
                <div class="container">
                  <!-- Header -->
                  <div class="header">
                    <h1>Skill Bridge</h1>
                    <p>Connect with expert tutors, learn anything</p>
                  </div>

                  <!-- Content -->
                  <div class="content">
                    <h2>Verify your email address</h2>

                    <p>
                      Hello <strong>${user.name}</strong>,
                    </p>

                    <p>
                      Welcome to <strong>Skill Bridge</strong> \u{1F393}
                      You're just one step away from accessing expert tutors and starting
                      your learning journey.
                    </p>

                    <p>
                      Please confirm your email address by clicking the button below:
                    </p>

                    <div class="button-wrapper">
                      <a href="${verificationUrl}" class="button">
                        Verify Email
                      </a>
                    </div>

                    <p>
                      If the button doesn\u2019t work, copy and paste this link into your browser:
                    </p>

                    <div class="link-box">
                      ${verificationUrl}
                    </div>

                    <p style="margin-top: 24px;">
                      If you didn\u2019t create an account on Skill Bridge, you can safely ignore
                      this email.
                    </p>

                    <p>
                      Happy learning,<br />
                      <strong>Skill Bridge Team</strong>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    \xA9 2026 <strong>Skill Bridge</strong>. All rights reserved.<br />
                    Learn. Grow. Succeed.
                  </div>
                </div>
              </body>
            </html>
            `
        });
      } catch (error) {
        throw error;
      }
    }
  },
  socialProviders: {
    google: {
      prompt: "select_account consent",
      accessType: "offline",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  },
  secret: process.env.BETTER_AUTH_SECRET
});

// src/app.ts
var app = express();
var allowedOrigins = Array.from(
  new Set([
    process.env.APP_URL,
    "http://localhost:3000",
    "https://skill-bridge-client-two-beta.vercel.app"
  ].filter(Boolean))
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());
app.all("/api/auth/*splat", toNodeHandler(auth));
app.get("/", (req, res) => {
  res.send("SkillBridge API is running");
});
app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }
  const isDashboardRequest = req.query.dashboard !== void 0 || Boolean(req.headers.cookie) || Boolean(req.headers.authorization);
  if (isDashboardRequest || req.path.endsWith("/availability")) {
    res.setHeader("Cache-Control", "no-store");
    next();
    return;
  }
  const isPublicListOrDetail = req.path === "/categories" || req.path === "/courses/popular" || /^\/courses(?:\/[^/]+)?$/.test(req.path) || /^\/mentors(?:\/[^/]+)?$/.test(req.path) || req.path === "/reviews";
  if (isPublicListOrDetail) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=45, stale-while-revalidate=300"
    );
  }
  next();
});
var app_default = app;

// src/modules/categories/category.routes.ts
import express2 from "express";

// src/modules/categories/category.service.ts
var createCategory = async (payload) => {
  return prisma.category.create({
    data: payload
  });
};
var getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" }
  });
};
var getSingleCategory = async (id) => {
  return prisma.category.findUnique({
    where: { id }
  });
};
var updateCategory = async (id, payload) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      select: { name: true }
    });
    if (!existing) {
      throw new Error("Category not found");
    }
    const updated = await tx.category.update({
      where: { id },
      data: payload
    });
    if (payload.name && payload.name !== existing.name) {
      const tutorProfiles = await tx.tutorProfile.findMany({
        where: { subjects: { has: existing.name } },
        select: { id: true, subjects: true }
      });
      await Promise.all(
        tutorProfiles.map(
          (profile) => tx.tutorProfile.update({
            where: { id: profile.id },
            data: {
              subjects: profile.subjects.map(
                (subject) => subject === existing.name ? payload.name : subject
              )
            }
          })
        )
      );
    }
    return updated;
  });
};
var deleteCategory = async (id) => {
  const courseCount = await prisma.course.count({
    where: { categoryId: id }
  });
  if (courseCount > 0) {
    throw new Error(
      "Cannot delete a category that has courses. Remove or reassign courses first."
    );
  }
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id },
      select: { name: true }
    });
    if (!category) {
      throw new Error("Category not found");
    }
    const deleted = await tx.category.delete({
      where: { id }
    });
    const tutorProfiles = await tx.tutorProfile.findMany({
      where: { subjects: { has: category.name } },
      select: { id: true, subjects: true }
    });
    await Promise.all(
      tutorProfiles.map(
        (profile) => tx.tutorProfile.update({
          where: { id: profile.id },
          data: {
            subjects: profile.subjects.filter(
              (subject) => subject !== category.name
            )
          }
        })
      )
    );
    return deleted;
  });
};
var CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory
};

// src/modules/categories/category.validation.ts
import { z } from "zod";
var createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Category name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  image: z.string().url().optional().or(z.literal(""))
});
var updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Category name must be 100 characters or less").optional(),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  image: z.string().url().optional().or(z.literal(""))
});

// src/lib/image/image-upload.service.ts
import axios from "axios";
import { lookup } from "node:dns/promises";
import net from "node:net";

// src/lib/image/image.optimizer.ts
import sharp from "sharp";

// src/lib/image/image.presets.ts
var IMAGE_PRESETS = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 82,
    cloudinaryFolder: "skill-bridge/avatars"
  },
  course: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 78,
    cloudinaryFolder: "skill-bridge/courses"
  },
  category: {
    maxWidth: 900,
    maxHeight: 506,
    quality: 76,
    cloudinaryFolder: "skill-bridge/categories"
  },
  general: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 78,
    cloudinaryFolder: "skill-bridge/uploads"
  }
};
var IMAGE_PRESET_VALUES = Object.keys(IMAGE_PRESETS);
function parseImagePreset(value) {
  if (typeof value === "string" && IMAGE_PRESET_VALUES.includes(value)) {
    return value;
  }
  return "general";
}

// src/lib/image/image.optimizer.ts
async function optimizeImageBuffer(input, preset) {
  const { maxWidth, maxHeight, quality } = IMAGE_PRESETS[preset];
  const base = sharp(input, { failOn: "none", animated: false }).rotate();
  const resized = base.resize({
    width: maxWidth,
    height: maxHeight,
    fit: "inside",
    withoutEnlargement: true
  });
  const webpResult = await tryEncode(resized.clone(), "webp", quality);
  if (webpResult) return webpResult;
  const avifResult = await tryEncode(resized.clone(), "avif", quality);
  if (avifResult) return avifResult;
  throw new Error("Image optimization failed");
}
async function tryEncode(pipeline, format, quality) {
  try {
    const encoder = format === "avif" ? pipeline.avif({ quality, effort: 2 }) : pipeline.webp({ quality, effort: 2, alphaQuality: quality });
    const { data, info } = await encoder.toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      format,
      mimeType: format === "avif" ? "image/avif" : "image/webp",
      extension: format,
      width: info.width,
      height: info.height
    };
  } catch {
    return null;
  }
}

// src/lib/image/image.storage.ts
import { randomUUID } from "crypto";

// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var cloudinary_default = cloudinary;

// src/lib/image/image.storage.ts
function uploadOptimizedToCloudinary(optimized, folder) {
  const publicId = randomUUID();
  return new Promise((resolve, reject) => {
    const stream = cloudinary_default.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        format: optimized.format,
        resource_type: "image"
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(optimized.buffer);
  });
}

// src/lib/image/image-upload.service.ts
var MAX_SOURCE_BYTES = 5 * 1024 * 1024;
var ALLOWED_REMOTE_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
var ALLOWED_REMOTE_CONTENT_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif"
]);
async function processAndStore(buffer, preset) {
  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error("Image must be under 5MB before optimization");
  }
  const optimized = await optimizeImageBuffer(buffer, preset);
  const folder = IMAGE_PRESETS[preset].cloudinaryFolder;
  const url = await uploadOptimizedToCloudinary(optimized, folder);
  return {
    url,
    format: optimized.format,
    width: optimized.width,
    height: optimized.height
  };
}
function isPrivateIPv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }
  const first = parts[0];
  const second = parts[1];
  return first === 10 || first === 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168 || first === 0;
}
function isPrivateIPv6(address) {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}
function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}
async function validateRemoteImageUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid image URL");
  }
  if (!ALLOWED_REMOTE_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("Image URL must use HTTP or HTTPS");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local image URLs are not allowed");
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private or local image URLs are not allowed");
  }
  return parsed.toString();
}
function assertRemoteImageContentType(contentType) {
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  const mimeType = typeof value === "string" ? (value.split(";")[0] ?? "").trim().toLowerCase() : "";
  if (!ALLOWED_REMOTE_CONTENT_TYPES.has(mimeType)) {
    throw new Error("Remote URL must return a supported image type");
  }
}
var ImageUploadService = {
  async fromMulterFile(file, presetInput) {
    const preset = parseImagePreset(presetInput);
    return processAndStore(file.buffer, preset);
  },
  async fromUrl(url, presetInput) {
    const preset = parseImagePreset(presetInput);
    const safeUrl = await validateRemoteImageUrl(url);
    const response = await axios.get(safeUrl, {
      responseType: "arraybuffer",
      maxContentLength: MAX_SOURCE_BYTES,
      maxBodyLength: MAX_SOURCE_BYTES,
      timeout: 15e3,
      validateStatus: (s) => s === 200
    });
    assertRemoteImageContentType(response.headers["content-type"]);
    return processAndStore(Buffer.from(response.data), preset);
  },
  async fromBuffer(buffer, presetInput) {
    const preset = parseImagePreset(presetInput);
    return processAndStore(buffer, preset);
  }
};

// src/modules/categories/category.controller.ts
var createCategory2 = async (req, res) => {
  try {
    const validatedData = createCategorySchema.parse(req.body);
    const cleanData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== void 0)
    );
    const result = await CategoryService.createCategory(cleanData);
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var uploadCategoryImage = async (req, res) => {
  try {
    const file = req.file;
    const { url } = req.body;
    const result = file ? await ImageUploadService.fromMulterFile(file, "category") : url ? await ImageUploadService.fromUrl(url, "category") : null;
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Provide an image file or URL"
      });
    }
    res.status(200).json({
      success: true,
      message: "Image optimized and uploaded",
      data: result,
      url: result.url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    res.status(400).json({ success: false, message });
  }
};
var getAllCategories2 = async (req, res) => {
  try {
    const result = await CategoryService.getAllCategories();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var getSingleCategory2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CategoryService.getSingleCategory(id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var updateCategory2 = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateCategorySchema.parse(req.body);
    const cleanData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, value]) => value !== void 0)
    );
    const result = await CategoryService.updateCategory(id, cleanData);
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var deleteCategory2 = async (req, res) => {
  try {
    const { id } = req.params;
    await CategoryService.deleteCategory(id);
    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var CategoryController = {
  createCategory: createCategory2,
  getAllCategories: getAllCategories2,
  getSingleCategory: getSingleCategory2,
  updateCategory: updateCategory2,
  deleteCategory: deleteCategory2,
  uploadCategoryImage
};

// src/middlewares/auth.ts
var auth2 = (...roles) => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers
      });
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }
      if (!session.user.emailVerified) {
        return res.status(403).json({
          success: false,
          message: "Email verification required. Please verify your email to proceed."
        });
      }
      const status = session.user.status;
      if (status === "PENDING") {
        return res.status(403).json({
          success: false,
          message: "Your account is pending admin approval. You will be notified once approved."
        });
      }
      if (status === "REJECTED") {
        return res.status(403).json({
          success: false,
          message: "Your tutor application has been rejected. Please contact support for more information."
        });
      }
      if (status === "BANNED") {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Please contact support."
        });
      }
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        emailVerified: session.user.emailVerified
      };
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have the required permissions to access this resource."
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
var auth_default = auth2;

// src/middlewares/imageUpload.middleware.ts
import multer from "multer";
var ALLOWED_IMAGE_MIMETYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif"
]);
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported image type. Use JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, or HEIC."
        )
      );
    }
  }
});
function handleImageUploadError(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be under 5MB" : err.message;
    return res.status(400).json({ success: false, message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return res.status(400).json({ success: false, message: "Upload failed" });
}
function uploadSingleImage(fieldName = "image") {
  return (req, res, next) => {
    imageUpload.single(fieldName)(req, res, (err) => {
      if (err) return handleImageUploadError(err, req, res, next);
      next();
    });
  };
}

// src/modules/categories/category.routes.ts
var router = express2.Router();
router.get("/", CategoryController.getAllCategories);
router.get("/:id", CategoryController.getSingleCategory);
router.post("/", auth_default("ADMIN" /* ADMIN */), CategoryController.createCategory);
router.patch("/:id", auth_default("ADMIN" /* ADMIN */), CategoryController.updateCategory);
router.delete("/:id", auth_default("ADMIN" /* ADMIN */), CategoryController.deleteCategory);
router.post(
  "/upload-image",
  auth_default("ADMIN" /* ADMIN */),
  uploadSingleImage("image"),
  CategoryController.uploadCategoryImage
);
var categoryRouter = router;

// src/modules/courses/course.routes.ts
import { Router as Router2 } from "express";

// src/modules/courses/course.service.ts
import { CourseDeleteRequestStatus } from "@prisma/client";
var courseInclude = {
  category: {
    select: { id: true, name: true, description: true, image: true }
  },
  createdBy: {
    select: { id: true, name: true, image: true, role: true }
  },
  tutor: {
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      status: true,
      tutorProfile: {
        select: {
          id: true
        }
      }
    }
  },
  deleteRequests: {
    where: { status: CourseDeleteRequestStatus.PENDING },
    select: {
      id: true,
      requesterId: true,
      status: true,
      createdAt: true
    }
  }
};
var db = prisma;
var ensureTutorHasCategory = async (tutorId, categoryId) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true }
  });
  if (!category) throw new Error("Category not found");
  const tutor = await prisma.user.findUnique({
    where: { id: tutorId },
    include: {
      tutorProfile: {
        select: {
          id: true,
          subjects: true,
          categories: {
            where: { categoryId: category.id },
            select: { categoryId: true }
          }
        }
      }
    }
  });
  if (!tutor || tutor.role !== "TUTOR" || tutor.status !== "ACTIVE" || !tutor.tutorProfile) {
    throw new Error("Invalid tutor selected");
  }
  if (tutor.tutorProfile.categories.length === 0) {
    await prisma.tutorCategory.createMany({
      data: {
        tutorId: tutor.tutorProfile.id,
        categoryId: category.id
      },
      skipDuplicates: true
    });
  }
  if (!tutor.tutorProfile.subjects.includes(category.name)) {
    await prisma.tutorProfile.update({
      where: { id: tutor.tutorProfile.id },
      data: {
        subjects: [...tutor.tutorProfile.subjects, category.name]
      }
    });
  }
  return { tutor, category };
};
var getAllCourses = async (filters = {}) => {
  return db.course.findMany({
    where: {
      ...filters.popular && { isPopular: true },
      ...filters.categoryId && { categoryId: filters.categoryId },
      ...filters.createdById && { createdById: filters.createdById },
      ...filters.tutorId && { tutorId: filters.tutorId },
      ...filters.mineUserId && filters.mineRole === "TUTOR" && {
        tutorId: filters.mineUserId
      },
      ...filters.mineUserId && filters.mineRole === "ADMIN" && {
        createdById: filters.mineUserId
      }
    },
    include: courseInclude,
    orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }]
  });
};
var getSingleCourse = async (id) => {
  const course = await db.course.findUnique({
    where: { id },
    include: courseInclude
  });
  if (!course) throw new Error("Course not found");
  return course;
};
var createCourse = async (createdById, role, payload) => {
  const tutorId = role === "ADMIN" ? payload.tutorId : createdById;
  if (!tutorId) {
    throw new Error("Please select a tutor for this course");
  }
  await ensureTutorHasCategory(tutorId, payload.categoryId);
  return db.course.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      image: payload.image || null,
      categoryId: payload.categoryId,
      createdById,
      tutorId
    },
    include: courseInclude
  });
};
var updateCourse = async (id, userId, role, payload) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");
  if (role !== "ADMIN" && payload.tutorId !== void 0) {
    throw new Error("Only admins can reassign course tutors");
  }
  if (role !== "ADMIN" && course.tutorId !== userId) {
    throw new Error("You can only edit courses assigned to you");
  }
  const tutorId = payload.tutorId;
  const nextTutorId = tutorId ?? course.tutorId;
  const nextCategoryId = payload.categoryId ?? course.categoryId;
  if (!nextTutorId) {
    throw new Error("Please select a tutor for this course");
  }
  await ensureTutorHasCategory(nextTutorId, nextCategoryId);
  return db.course.update({
    where: { id },
    data: {
      ...payload.title !== void 0 && { title: payload.title },
      ...payload.description !== void 0 && {
        description: payload.description || null
      },
      ...payload.image !== void 0 && { image: payload.image || null },
      ...payload.categoryId !== void 0 && {
        categoryId: payload.categoryId
      },
      ...tutorId !== void 0 && {
        tutorId
      }
    },
    include: courseInclude
  });
};
var deleteCourse = async (id, userId, role) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");
  if (role !== "ADMIN") {
    throw new Error("Tutors must request admin approval to delete courses");
  }
  await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { courseId: id },
      data: { courseId: null }
    });
    await tx.course.delete({ where: { id } });
  });
  return { message: "Course deleted successfully" };
};
var requestCourseDelete = async (id, requesterId, role) => {
  const course = await db.course.findUnique({
    where: { id },
    include: {
      deleteRequests: {
        where: {
          requesterId,
          status: CourseDeleteRequestStatus.PENDING
        }
      }
    }
  });
  if (!course) throw new Error("Course not found");
  if (role !== "TUTOR" || course.tutorId !== requesterId) {
    throw new Error("You can only request deletion for courses assigned to you");
  }
  if (course.deleteRequests.length > 0) {
    return {
      message: "Delete request is already pending admin approval",
      data: course.deleteRequests[0]
    };
  }
  const request = await prisma.courseDeleteRequest.create({
    data: {
      courseId: id,
      requesterId
    },
    include: {
      course: { include: courseInclude },
      requester: {
        select: { id: true, name: true, email: true, image: true }
      }
    }
  });
  return {
    message: "Delete request sent to admin for approval",
    data: request
  };
};
var getDeleteRequests = async () => {
  return prisma.courseDeleteRequest.findMany({
    where: { status: CourseDeleteRequestStatus.PENDING },
    include: {
      course: { include: courseInclude },
      requester: {
        select: { id: true, name: true, email: true, image: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var resolveDeleteRequest = async (requestId, adminId, action) => {
  const request = await prisma.courseDeleteRequest.findUnique({
    where: { id: requestId }
  });
  if (!request) throw new Error("Delete request not found");
  if (request.status !== CourseDeleteRequestStatus.PENDING) {
    throw new Error("Delete request has already been resolved");
  }
  if (action === "REJECTED") {
    return prisma.courseDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: CourseDeleteRequestStatus.REJECTED,
        resolvedById: adminId,
        resolvedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  return prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { courseId: request.courseId },
      data: { courseId: null }
    });
    const resolved = await tx.courseDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: CourseDeleteRequestStatus.APPROVED,
        resolvedById: adminId,
        resolvedAt: /* @__PURE__ */ new Date()
      }
    });
    await tx.course.delete({ where: { id: request.courseId } });
    return resolved;
  });
};
var togglePopular = async (id, isPopular) => {
  const course = await db.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");
  return db.course.update({
    where: { id },
    data: { isPopular },
    include: courseInclude
  });
};
var CourseService = {
  getAllCourses,
  getSingleCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  requestCourseDelete,
  getDeleteRequests,
  resolveDeleteRequest,
  togglePopular
};

// src/modules/courses/course.validation.ts
import { z as z2 } from "zod";
var createCourseSchema = z2.object({
  title: z2.string().min(1, "Title is required").max(150),
  description: z2.string().max(2e3).optional(),
  image: z2.string().url().optional().or(z2.literal("")),
  categoryId: z2.string().uuid("Invalid category ID"),
  tutorId: z2.string().min(1, "Tutor is required").optional()
});
var updateCourseSchema = z2.object({
  title: z2.string().min(1).max(150).optional(),
  description: z2.string().max(2e3).optional(),
  image: z2.string().url().optional().or(z2.literal("")),
  categoryId: z2.string().uuid().optional(),
  tutorId: z2.string().min(1, "Tutor is required").optional()
});
var togglePopularSchema = z2.object({
  isPopular: z2.boolean()
});

// src/modules/courses/course.controller.ts
var getAllCourses2 = async (req, res) => {
  try {
    const popular = req.query.popular === "true";
    const categoryId = req.query.categoryId;
    const mine = req.query.mine === "true";
    if (mine && !req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const filters = {
      ...popular && { popular: true },
      ...categoryId && { categoryId },
      ...mine && req.user?.id && req.user?.role && { mineUserId: req.user.id, mineRole: req.user.role }
    };
    const result = await CourseService.getAllCourses(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var getPopularCourses = async (req, res) => {
  try {
    const result = await CourseService.getAllCourses({ popular: true });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var getSingleCourse2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CourseService.getSingleCourse(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const status = error.message === "Course not found" ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};
var createCourse2 = async (req, res) => {
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
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var updateCourse2 = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateCourseSchema.parse(req.body);
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");
    const result = await CourseService.updateCourse(
      id,
      userId,
      role,
      parsed
    );
    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var deleteCourse2 = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");
    const result = await CourseService.deleteCourse(id, userId, role);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var requestCourseDelete2 = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");
    const result = await CourseService.requestCourseDelete(
      id,
      userId,
      role
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var getDeleteRequests2 = async (_req, res) => {
  try {
    const result = await CourseService.getDeleteRequests();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var resolveDeleteRequest2 = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const action = req.body?.action;
    if (!adminId) throw new Error("Unauthorized");
    if (action !== "APPROVED" && action !== "REJECTED") {
      throw new Error("Invalid action");
    }
    const result = await CourseService.resolveDeleteRequest(
      id,
      adminId,
      action
    );
    res.status(200).json({
      success: true,
      message: action === "APPROVED" ? "Course delete request approved" : "Course delete request rejected",
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var togglePopular2 = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPopular } = togglePopularSchema.parse(req.body);
    const result = await CourseService.togglePopular(id, isPopular);
    res.status(200).json({
      success: true,
      message: isPopular ? "Course marked as popular" : "Course removed from popular",
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var CourseController = {
  getAllCourses: getAllCourses2,
  getPopularCourses,
  getSingleCourse: getSingleCourse2,
  createCourse: createCourse2,
  updateCourse: updateCourse2,
  deleteCourse: deleteCourse2,
  requestCourseDelete: requestCourseDelete2,
  getDeleteRequests: getDeleteRequests2,
  resolveDeleteRequest: resolveDeleteRequest2,
  togglePopular: togglePopular2
};

// src/modules/courses/course.routes.ts
var router2 = Router2();
router2.get("/popular", CourseController.getPopularCourses);
router2.get(
  "/delete-requests",
  auth_default("ADMIN" /* ADMIN */),
  CourseController.getDeleteRequests
);
router2.get("/mine", auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */), (req, res) => {
  req.query.mine = "true";
  return CourseController.getAllCourses(req, res);
});
router2.patch(
  "/delete-requests/:id",
  auth_default("ADMIN" /* ADMIN */),
  CourseController.resolveDeleteRequest
);
router2.get("/", CourseController.getAllCourses);
router2.get("/:id", CourseController.getSingleCourse);
router2.post(
  "/",
  auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */),
  CourseController.createCourse
);
router2.patch(
  "/:id/popular",
  auth_default("ADMIN" /* ADMIN */),
  CourseController.togglePopular
);
router2.patch(
  "/:id",
  auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */),
  CourseController.updateCourse
);
router2.delete(
  "/:id",
  auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */),
  CourseController.deleteCourse
);
router2.post(
  "/:id/delete-request",
  auth_default("TUTOR" /* TUTOR */),
  CourseController.requestCourseDelete
);
var courseRouter = router2;

// src/modules/tutors/tutor.routes.ts
import { Router as Router3 } from "express";

// src/utils/tutorCategorySync.ts
var normalizeSubjects = (subjects) => Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean)));
var getValidCategorySubjects = async (tx, subjects) => {
  const normalizedSubjects = normalizeSubjects(subjects);
  if (normalizedSubjects.length === 0) {
    return [];
  }
  const categories = await tx.category.findMany({
    where: { name: { in: normalizedSubjects } },
    select: { id: true, name: true }
  });
  const categoryNames = new Set(categories.map((category) => category.name));
  return normalizedSubjects.filter((subject) => categoryNames.has(subject));
};
var syncTutorCategories = async (tx, tutorId, subjects) => {
  const validSubjects = await getValidCategorySubjects(tx, subjects);
  await tx.tutorCategory.deleteMany({
    where: { tutorId }
  });
  if (validSubjects.length === 0) {
    return validSubjects;
  }
  const categories = await tx.category.findMany({
    where: { name: { in: validSubjects } },
    select: { id: true }
  });
  await tx.tutorCategory.createMany({
    data: categories.map((category) => ({
      tutorId,
      categoryId: category.id
    })),
    skipDuplicates: true
  });
  return validSubjects;
};

// src/modules/tutors/tutor.service.ts
var createTutor = async (userId, payload) => {
  return await prisma.$transaction(async (tx) => {
    const isExist = await tx.tutorProfile.findUnique({
      where: { userId }
    });
    if (isExist) {
      throw new Error("Tutor profile already exists");
    }
    const validSubjects = await getValidCategorySubjects(tx, payload.subjects);
    if (validSubjects.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }
    const result = await tx.tutorProfile.create({
      data: {
        userId,
        bio: payload.bio,
        subjects: validSubjects,
        price: payload.price
      }
    });
    await syncTutorCategories(tx, result.id, validSubjects);
    return result;
  });
};
var updateTutor = async (userId, payload) => {
  return await prisma.$transaction(async (tx) => {
    const validSubjects = payload.subjects !== void 0 ? await getValidCategorySubjects(tx, payload.subjects) : void 0;
    if (payload.subjects !== void 0 && validSubjects?.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }
    const updateData = {
      ...payload.bio !== void 0 && {
        bio: payload.bio
      },
      ...validSubjects !== void 0 && {
        subjects: validSubjects
      },
      ...payload.price !== void 0 && {
        price: payload.price
      }
    };
    const result = await tx.tutorProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        bio: payload.bio ?? "",
        subjects: validSubjects ?? [],
        price: payload.price ?? 0
      }
    });
    if (validSubjects !== void 0) {
      await syncTutorCategories(tx, result.id, validSubjects);
    }
    return result;
  });
};
var getTutorProfileByUserId = async (userId) => {
  return await prisma.tutorProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      reviews: true,
      availabilities: true
    }
  });
};
var getAllTutors = async (filters = {}) => {
  const { search, minPrice, maxPrice, minRating, categoryId } = filters;
  return await prisma.tutorProfile.findMany({
    where: {
      user: {
        role: "TUTOR",
        status: "ACTIVE"
      },
      ...search && {
        OR: [
          {
            subjects: {
              hasSome: [search]
            }
          },
          {
            bio: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            user: {
              name: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        ]
      },
      ...minPrice !== void 0 && {
        price: {
          gte: minPrice
        }
      },
      ...maxPrice !== void 0 && {
        price: {
          lte: maxPrice
        }
      },
      ...minRating !== void 0 && {
        rating: {
          gte: minRating
        }
      },
      ...categoryId && {
        categories: {
          some: {
            categoryId
          }
        }
      }
    },
    include: {
      user: true,
      reviews: true
    },
    orderBy: {
      rating: "desc"
    }
  });
};
var getSingleTutor = async (id) => {
  return await prisma.tutorProfile.findFirst({
    where: { id, user: { role: "TUTOR", status: "ACTIVE" } },
    include: {
      user: {
        include: {
          assignedCourses: {
            include: {
              category: {
                select: { id: true, name: true, description: true, image: true }
              },
              tutor: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                  status: true,
                  tutorProfile: {
                    select: { id: true }
                  }
                }
              },
              createdBy: {
                select: { id: true, name: true, image: true, role: true }
              }
            },
            orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }]
          }
        }
      },
      reviews: true,
      availabilities: true
    }
  });
};
var TutorService = {
  createTutor,
  updateTutor,
  getTutorProfileByUserId,
  getAllTutors,
  getSingleTutor
};

// src/modules/reviews/review.service.ts
var createReview = async (studentId, payload) => {
  const booking = await prisma.booking.findUnique({
    where: { id: payload.bookingId },
    include: { review: true }
  });
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (booking.studentId !== studentId) {
    throw new Error("Unauthorized");
  }
  if (booking.status !== "COMPLETED") {
    throw new Error("Can only review completed bookings");
  }
  if (booking.review) {
    throw new Error("Review already exists for this booking");
  }
  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        bookingId: payload.bookingId,
        studentId,
        tutorId: booking.tutorId,
        rating: payload.rating,
        comment: payload.comment
      },
      include: {
        booking: {
          include: {
            student: {
              select: { id: true, name: true, email: true }
            },
            tutor: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });
    const tutorReviews = await tx.review.findMany({
      where: { tutorId: booking.tutorId }
    });
    const avgRating = tutorReviews.length > 0 ? tutorReviews.reduce((sum, r) => sum + r.rating, 0) / tutorReviews.length : 0;
    await tx.tutorProfile.update({
      where: { id: booking.tutorId },
      data: { rating: avgRating }
    });
    return review;
  });
  return result;
};
var getTutorReviews = async (tutorId, includeHidden = false) => {
  return await prisma.review.findMany({
    where: {
      tutorId,
      ...includeHidden ? {} : { isHidden: false }
    },
    include: {
      booking: {
        include: {
          student: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var getPublicReviews = async () => {
  return await prisma.review.findMany({
    where: { isHidden: false },
    include: {
      booking: {
        include: {
          student: {
            select: { id: true, name: true, email: true, image: true }
          },
          tutor: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var toggleReviewVisibility = async (reviewId, userId, role) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found");
  if (role === "TUTOR") {
    const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
    if (!profile || review.tutorId !== profile.id) {
      throw new Error("You can only manage reviews on your own profile");
    }
  }
  return await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden: !review.isHidden },
    select: { id: true, isHidden: true }
  });
};
var getStudentReviews = async (studentId) => {
  return await prisma.review.findMany({
    where: { studentId },
    include: {
      booking: {
        include: {
          tutor: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var ReviewService = {
  createReview,
  getPublicReviews,
  getTutorReviews,
  toggleReviewVisibility,
  getStudentReviews
};

// src/modules/availability/availability.service.ts
var createAvailability = async (tutorId, payload) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  const existing = await prisma.availability.findFirst({
    where: {
      tutorId: tutorProfile.id,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime
    }
  });
  if (existing) {
    throw new Error("Availability slot already exists");
  }
  const result = await prisma.availability.create({
    data: {
      tutorId: tutorProfile.id,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime
    }
  });
  return result;
};
var getTutorAvailability = async (tutorId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  return await prisma.availability.findMany({
    where: { tutorId: tutorProfile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
  });
};
var updateAvailability = async (tutorId, payload) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  const existing = await prisma.availability.findFirst({
    where: {
      id: payload.id,
      tutorId: tutorProfile.id
    }
  });
  if (!existing) {
    throw new Error("Availability not found");
  }
  const result = await prisma.availability.update({
    where: { id: payload.id },
    data: {
      ...payload.dayOfWeek !== void 0 && { dayOfWeek: payload.dayOfWeek },
      ...payload.startTime !== void 0 && { startTime: payload.startTime },
      ...payload.endTime !== void 0 && { endTime: payload.endTime }
    }
  });
  return result;
};
var deleteAvailability = async (tutorId, availabilityId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  const existing = await prisma.availability.findFirst({
    where: {
      id: availabilityId,
      tutorId: tutorProfile.id
    }
  });
  if (!existing) {
    throw new Error("Availability not found");
  }
  await prisma.availability.delete({
    where: { id: availabilityId }
  });
  return { message: "Availability deleted successfully" };
};
var getPublicTutorAvailability = async (tutorId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor not found");
  }
  return await prisma.availability.findMany({
    where: { tutorId: tutorProfile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
  });
};
var bulkUpdateAvailability = async (tutorId, slots) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  return await prisma.$transaction(async (tx) => {
    await tx.availability.deleteMany({
      where: { tutorId: tutorProfile.id }
    });
    const results = await Promise.all(
      slots.map(
        (slot) => tx.availability.create({
          data: {
            tutorId: tutorProfile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime
          }
        })
      )
    );
    return results;
  });
};
var AvailabilityService = {
  createAvailability,
  getTutorAvailability,
  updateAvailability,
  deleteAvailability,
  getPublicTutorAvailability,
  bulkUpdateAvailability
};

// src/utils/httpStatus.ts
function getHttpStatusFromMessage(message = "") {
  const normalized = message.toLowerCase();
  if (normalized.includes("unauthorized")) return 401;
  if (normalized.includes("forbidden") || normalized.includes("permission") || normalized.includes("pending admin approval") || normalized.includes("suspended") || normalized.includes("rejected")) {
    return 403;
  }
  if (normalized.includes("not found")) return 404;
  if (normalized.includes("already exists") || normalized.includes("already booked") || normalized.includes("already reviewed")) {
    return 409;
  }
  return 400;
}

// src/modules/tutors/tutor.controller.ts
var getTutorProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const result = await TutorService.getTutorProfileByUserId(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var getTutorReviews2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ReviewService.getTutorReviews(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var getTutorAvailability2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AvailabilityService.getPublicTutorAvailability(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var createTutor2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await TutorService.createTutor(userId, req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var updateTutor2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await TutorService.updateTutor(userId, req.body);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getAllTutors2 = async (req, res) => {
  try {
    const { search, minPrice, maxPrice, minRating, categoryId } = req.query;
    const filters = {};
    if (search) filters.search = search;
    if (minPrice) {
      const parsed = Number(minPrice);
      if (!isNaN(parsed)) filters.minPrice = parsed;
    }
    if (maxPrice) {
      const parsed = Number(maxPrice);
      if (!isNaN(parsed)) filters.maxPrice = parsed;
    }
    if (minRating) {
      const parsed = Number(minRating);
      if (!isNaN(parsed)) filters.minRating = parsed;
    }
    if (categoryId) filters.categoryId = categoryId;
    const result = await TutorService.getAllTutors(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var getSingleTutor2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TutorService.getSingleTutor(id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var TutorController = {
  getTutorProfile,
  getTutorReviews: getTutorReviews2,
  getTutorAvailability: getTutorAvailability2,
  createTutor: createTutor2,
  updateTutor: updateTutor2,
  getAllTutors: getAllTutors2,
  getSingleTutor: getSingleTutor2
};

// src/modules/tutors/tutor.routes.ts
var router3 = Router3();
router3.get("/", TutorController.getAllTutors);
router3.get("/profile/me", auth_default("TUTOR" /* TUTOR */), TutorController.getTutorProfile);
router3.get("/:id", TutorController.getSingleTutor);
router3.get("/:id/reviews", TutorController.getTutorReviews);
router3.get("/:id/availability", TutorController.getTutorAvailability);
router3.post(
  "/profile",
  auth_default("TUTOR" /* TUTOR */),
  TutorController.createTutor
);
router3.put(
  "/profile",
  auth_default("TUTOR" /* TUTOR */),
  TutorController.updateTutor
);
var tutorRouter = router3;

// src/modules/bookings/booking.routes.ts
import express3 from "express";

// src/modules/bookings/booking.service.ts
import { BookingStatus, Prisma } from "@prisma/client";

// src/helpers/booking.helpers.ts
function dayOfWeekFromDateString(date) {
  const [y, m, d] = date.split("-").map(Number);
  if (y === void 0 || m === void 0 || d === void 0) {
    throw new Error("Invalid date format (YYYY-MM-DD)");
  }
  return new Date(y, m - 1, d).getDay();
}
function buildSessionDateTime(date, startTime) {
  return /* @__PURE__ */ new Date(`${date}T${startTime}:00`);
}

// src/modules/bookings/booking.service.ts
var ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED
];
var createBooking = async (studentId, payload) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: payload.tutorId },
    include: {
      user: { select: { status: true } }
    }
  });
  if (!tutor) {
    throw new Error("Tutor not found");
  }
  if (tutor.user?.status !== "ACTIVE") {
    throw new Error("This tutor is not available for bookings");
  }
  if (tutor.userId === studentId) {
    throw new Error("You cannot book your own session");
  }
  const course = await prisma.course.findFirst({
    where: {
      id: payload.courseId,
      tutorId: tutor.userId,
      tutor: {
        role: "TUTOR",
        status: "ACTIVE"
      }
    },
    select: { id: true }
  });
  if (!course) {
    throw new Error("Please select a valid course for this mentor");
  }
  const slot = await prisma.availability.findFirst({
    where: {
      id: payload.availabilityId,
      tutorId: payload.tutorId
    }
  });
  if (!slot) {
    throw new Error("Selected time slot is not available for this tutor");
  }
  const selectedDay = dayOfWeekFromDateString(payload.date);
  if (selectedDay !== slot.dayOfWeek) {
    throw new Error("Selected date does not match the chosen day of week");
  }
  const bookingDate = buildSessionDateTime(payload.date, slot.startTime);
  if (bookingDate <= /* @__PURE__ */ new Date()) {
    throw new Error("Booking date must be in the future");
  }
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const conflicting = await tx.booking.findFirst({
          where: {
            tutorId: payload.tutorId,
            dateTime: bookingDate,
            status: { in: [...ACTIVE_BOOKING_STATUSES] }
          }
        });
        if (conflicting) {
          throw new Error("This time slot is already booked");
        }
        return tx.booking.create({
          data: {
            studentId,
            tutorId: payload.tutorId,
            courseId: payload.courseId,
            dateTime: bookingDate,
            status: BookingStatus.PENDING
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            tutor: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            course: {
              include: {
                category: {
                  select: { id: true, name: true, description: true, image: true }
                }
              }
            }
          }
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new Error("This time slot is already booked");
    }
    throw error;
  }
};
var getStudentBookings = async (studentId) => {
  return await prisma.booking.findMany({
    where: { studentId },
    include: {
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true }
          }
        }
      },
      review: true
    },
    orderBy: { dateTime: "desc" }
  });
};
var getTutorBookings = async (tutorId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  return await prisma.booking.findMany({
    where: { tutorId: tutorProfile.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true }
          }
        }
      },
      review: true
    },
    orderBy: { dateTime: "desc" }
  });
};
var getSingleBooking = async (bookingId, userId, role) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true }
          }
        }
      },
      review: true
    }
  });
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (role === "STUDENT" && booking.studentId !== userId) {
    throw new Error("Unauthorized");
  }
  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId }
    });
    if (tutorProfile && booking.tutorId !== tutorProfile.id) {
      throw new Error("Unauthorized");
    }
  }
  return booking;
};
var updateBookingStatus = async (bookingId, userId, role, status) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  });
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (role === "STUDENT" && booking.studentId !== userId) {
    throw new Error("Unauthorized");
  }
  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId }
    });
    if (!tutorProfile || booking.tutorId !== tutorProfile.id) {
      throw new Error("Unauthorized");
    }
  }
  if (role === "ADMIN") {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });
  }
  if (status === "CANCELLED" && role === "STUDENT") {
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      throw new Error("Only pending or confirmed bookings can be cancelled");
    }
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });
  }
  if (role === "TUTOR") {
    if (status === "CONFIRMED") {
      if (booking.status !== "PENDING") {
        throw new Error("Only pending bookings can be confirmed");
      }
      return await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" }
      });
    }
    if (status === "COMPLETED") {
      if (booking.status !== "CONFIRMED") {
        throw new Error("Only confirmed sessions can be marked as completed");
      }
      return await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" }
      });
    }
  }
  throw new Error("Invalid status update");
};
var getAllBookings = async () => {
  return await prisma.booking.findMany({
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true }
          }
        }
      },
      review: true
    },
    orderBy: { createdAt: "desc" }
  });
};
var BookingService = {
  createBooking,
  getStudentBookings,
  getTutorBookings,
  getSingleBooking,
  updateBookingStatus,
  getAllBookings
};

// src/modules/bookings/booking.validation.ts
import { z as z3 } from "zod/v4";
var createBookingSchema = z3.object({
  tutorId: z3.string().uuid("Invalid tutor ID"),
  courseId: z3.string().uuid("Invalid course ID"),
  availabilityId: z3.string().uuid("Invalid availability slot ID"),
  date: z3.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
});
var updateBookingStatusSchema = z3.object({
  status: z3.enum(["CONFIRMED", "COMPLETED", "CANCELLED"])
});

// src/modules/bookings/booking.controller.ts
var createBooking2 = async (req, res) => {
  try {
    const parsed = createBookingSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await BookingService.createBooking(userId, parsed);
    res.status(201).json({
      success: true,
      message: "Booking request submitted. Waiting for tutor confirmation.",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getUserBookings = async (req, res) => {
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
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getSingleBooking2 = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!id || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }
    const result = await BookingService.getSingleBooking(id, userId, role);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var updateBookingStatus2 = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateBookingStatusSchema.parse(req.body);
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!id || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }
    const result = await BookingService.updateBookingStatus(id, userId, role, parsed.status);
    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var completeBooking = async (req, res) => {
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
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var BookingController = {
  createBooking: createBooking2,
  getUserBookings,
  getSingleBooking: getSingleBooking2,
  updateBookingStatus: updateBookingStatus2,
  completeBooking
};

// src/modules/bookings/booking.routes.ts
var router4 = express3.Router();
router4.post("/", auth_default("STUDENT" /* STUDENT */), BookingController.createBooking);
router4.get("/", auth_default(), BookingController.getUserBookings);
router4.get("/:id", auth_default(), BookingController.getSingleBooking);
router4.patch("/:id/status", auth_default(), BookingController.updateBookingStatus);
router4.patch(
  "/:id/complete",
  auth_default("TUTOR" /* TUTOR */),
  BookingController.completeBooking
);
var bookingRouter = router4;

// src/modules/admin/admin.routes.ts
import { Router as Router5 } from "express";

// src/modules/admin/admin.service.ts
import { UserStatus } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
var getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      tutorProfile: {
        select: {
          id: true,
          rating: true,
          price: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};
var getSingleUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      tutorProfile: {
        include: {
          categories: true,
          availabilities: true,
          reviews: {
            include: {
              booking: {
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true
                    }
                  }
                }
              }
            }
          }
        }
      },
      bookingsAsStudent: {
        include: {
          tutor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        },
        orderBy: {
          dateTime: "desc"
        }
      }
    }
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};
var updateUserStatus = async (userId, status) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (status === "BANNED" && user.role === "TUTOR") {
    const assignedCourses = await prisma.course.count({
      where: { tutorId: userId }
    });
    if (assignedCourses > 0) {
      throw new Error(
        "Reassign or delete this tutor's assigned courses before banning"
      );
    }
  }
  return await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      role: true,
      status: true
    }
  });
};
var getAllBookings2 = async () => {
  return await prisma.booking.findMany({
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      },
      course: {
        include: {
          category: {
            select: { id: true, name: true, description: true, image: true }
          }
        }
      },
      review: true
    },
    orderBy: { createdAt: "desc" }
  });
};
var getDashboardStats = async () => {
  const [
    totalUsers,
    totalTutors,
    totalStudents,
    totalBookings,
    totalCategories
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.booking.count(),
    prisma.category.count()
  ]);
  const recentBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { name: true, email: true, image: true }
      },
      tutor: {
        include: {
          user: {
            select: { name: true, image: true }
          }
        }
      },
      course: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
  const completedBookings = await prisma.booking.count({
    where: { status: "COMPLETED" }
  });
  return {
    totalUsers,
    totalTutors,
    totalStudents,
    totalBookings,
    totalCategories,
    completedBookings,
    recentBookings
  };
};
var makeTutor = async (userId, profileData) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.role === "TUTOR") throw new Error("User is already a tutor");
    await tx.user.update({
      where: { id: userId },
      data: { role: "TUTOR", status: UserStatus.ACTIVE }
    });
    const validSubjects = await getValidCategorySubjects(
      tx,
      profileData.subjects
    );
    if (validSubjects.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }
    const profile = await tx.tutorProfile.create({
      data: {
        userId,
        bio: profileData.bio,
        subjects: validSubjects,
        price: profileData.price
      }
    });
    await syncTutorCategories(tx, profile.id, validSubjects);
    return profile;
  });
};
var undoTutor = async (userId) => {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { tutorProfile: { select: { id: true } } }
    });
    if (!user) throw new Error("User not found");
    if (user.role !== "TUTOR") throw new Error("User is not a tutor");
    const assignedCourses = await tx.course.count({
      where: { tutorId: userId }
    });
    if (assignedCourses > 0) {
      throw new Error(
        "Reassign or delete this tutor's assigned courses before undoing tutor"
      );
    }
    if (user.tutorProfile) {
      await tx.tutorProfile.delete({ where: { id: user.tutorProfile.id } });
    }
    return await tx.user.update({
      where: { id: userId },
      data: { role: "STUDENT", status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        role: true,
        status: true
      }
    });
  });
};
var createTutor3 = async (userData, profileData) => {
  const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase();
  const hashedPassword = await hashPassword(generatedPassword);
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email: userData.email }
    });
    if (existing) throw new Error("A user with this email already exists");
    const user = await tx.user.create({
      data: {
        ...userData,
        role: "TUTOR",
        status: UserStatus.ACTIVE,
        emailVerified: true
      }
    });
    await tx.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    const validSubjects = await getValidCategorySubjects(
      tx,
      profileData.subjects
    );
    if (validSubjects.length === 0) {
      throw new Error("Select at least one valid category as a subject");
    }
    const profile = await tx.tutorProfile.create({
      data: {
        userId: user.id,
        bio: profileData.bio,
        subjects: validSubjects,
        price: profileData.price
      }
    });
    await syncTutorCategories(tx, profile.id, validSubjects);
    return { user, profile, generatedPassword };
  });
};
var getPendingTutors = async () => {
  return await prisma.user.findMany({
    where: { role: "TUTOR", status: UserStatus.PENDING },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      status: true,
      tutorProfile: {
        select: { id: true, bio: true, subjects: true, price: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
var approveTutor = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "TUTOR") throw new Error("User is not a tutor");
  if (user.status !== UserStatus.PENDING)
    throw new Error("User is not pending approval");
  return await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
    select: { id: true, name: true, email: true, role: true, status: true }
  });
};
var rejectTutor = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "TUTOR") throw new Error("User is not a tutor");
  if (user.status !== UserStatus.PENDING)
    throw new Error("User is not pending approval");
  return await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.REJECTED },
    select: { id: true, name: true, email: true, role: true, status: true }
  });
};
var deleteUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: { select: { id: true } } }
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role === "TUTOR") {
    const assignedCourses = await prisma.course.count({
      where: { tutorId: userId }
    });
    if (assignedCourses > 0) {
      throw new Error(
        "Reassign or delete this tutor's assigned courses before deleting"
      );
    }
  }
  return await prisma.$transaction(async (tx) => {
    if (user.tutorProfile) {
      const tutorId = user.tutorProfile.id;
      await tx.review.deleteMany({ where: { tutorId } });
      await tx.booking.deleteMany({ where: { tutorId } });
      await tx.availability.deleteMany({ where: { tutorId } });
      await tx.tutorCategory.deleteMany({ where: { tutorId } });
      await tx.tutorProfile.delete({ where: { id: tutorId } });
    }
    const studentBookings = await tx.booking.findMany({
      where: { studentId: userId },
      select: { id: true }
    });
    if (studentBookings.length > 0) {
      const bookingIds = studentBookings.map((b) => b.id);
      await tx.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.booking.deleteMany({ where: { studentId: userId } });
    }
    return await tx.user.delete({ where: { id: userId } });
  });
};
var AdminService = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  getAllBookings: getAllBookings2,
  getDashboardStats,
  makeTutor,
  undoTutor,
  createTutor: createTutor3,
  deleteUser,
  getPendingTutors,
  approveTutor,
  rejectTutor
};

// src/modules/admin/admin.validation.ts
import { z as z4 } from "zod/v4";
var makeTutorSchema = z4.object({
  bio: z4.string().min(10, "Bio must be at least 10 characters").max(1e3, "Bio must be 1000 characters or less"),
  subjects: z4.array(z4.string().min(1)).min(1, "At least one subject is required"),
  price: z4.number().positive("Price must be a positive number")
});
var createTutorSchema = z4.object({
  name: z4.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or less"),
  email: z4.string().email("Invalid email address"),
  bio: z4.string().min(10, "Bio must be at least 10 characters").max(1e3, "Bio must be 1000 characters or less"),
  subjects: z4.array(z4.string().min(1)).min(1, "At least one subject is required"),
  price: z4.number().positive("Price must be a positive number")
});

// src/modules/admin/admin.controller.ts
var getAllUsers2 = async (req, res) => {
  try {
    const result = await AdminService.getAllUsers();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getSingleUser2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AdminService.getSingleUser(id);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var updateUserStatus2 = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !["ACTIVE", "BANNED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or BANNED"
      });
    }
    const result = await AdminService.updateUserStatus(id, status);
    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getAllBookings3 = async (req, res) => {
  try {
    const result = await AdminService.getAllBookings();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getDashboardStats2 = async (req, res) => {
  try {
    const result = await AdminService.getDashboardStats();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var makeTutor2 = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = makeTutorSchema.parse(req.body);
    const result = await AdminService.makeTutor(id, validatedData);
    res.status(200).json({
      success: true,
      message: "User promoted to tutor successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var undoTutor2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AdminService.undoTutor(id);
    res.status(200).json({
      success: true,
      message: "Tutor changed back to student successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var createTutor4 = async (req, res) => {
  try {
    const validatedData = createTutorSchema.parse(req.body);
    const { name, email, bio, subjects, price } = validatedData;
    const result = await AdminService.createTutor({ name, email }, { bio, subjects, price });
    res.status(201).json({
      success: true,
      message: "Tutor created successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getPendingTutors2 = async (req, res) => {
  try {
    const result = await AdminService.getPendingTutors();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var approveTutor2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AdminService.approveTutor(id);
    res.status(200).json({ success: true, message: "Tutor approved successfully", data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var rejectTutor2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AdminService.rejectTutor(id);
    res.status(200).json({ success: true, message: "Tutor application rejected", data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var deleteUser2 = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AdminService.deleteUser(id);
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var AdminController = {
  getAllUsers: getAllUsers2,
  getSingleUser: getSingleUser2,
  updateUserStatus: updateUserStatus2,
  getAllBookings: getAllBookings3,
  getDashboardStats: getDashboardStats2,
  makeTutor: makeTutor2,
  undoTutor: undoTutor2,
  createTutor: createTutor4,
  deleteUser: deleteUser2,
  getPendingTutors: getPendingTutors2,
  approveTutor: approveTutor2,
  rejectTutor: rejectTutor2
};

// src/modules/admin/admin.routes.ts
var router5 = Router5();
router5.get("/stats", auth_default("ADMIN" /* ADMIN */), AdminController.getDashboardStats);
router5.get("/users", auth_default("ADMIN" /* ADMIN */), AdminController.getAllUsers);
router5.get("/users/:id", auth_default("ADMIN" /* ADMIN */), AdminController.getSingleUser);
router5.patch("/users/:id", auth_default("ADMIN" /* ADMIN */), AdminController.updateUserStatus);
router5.delete("/users/:id", auth_default("ADMIN" /* ADMIN */), AdminController.deleteUser);
router5.post("/users/:id/make-mentor", auth_default("ADMIN" /* ADMIN */), AdminController.makeTutor);
router5.post("/users/:id/undo-mentor", auth_default("ADMIN" /* ADMIN */), AdminController.undoTutor);
router5.post("/users/create-mentor", auth_default("ADMIN" /* ADMIN */), AdminController.createTutor);
router5.get("/bookings", auth_default("ADMIN" /* ADMIN */), AdminController.getAllBookings);
router5.get("/tutors/pending", auth_default("ADMIN" /* ADMIN */), AdminController.getPendingTutors);
router5.patch("/tutors/:id/approve", auth_default("ADMIN" /* ADMIN */), AdminController.approveTutor);
router5.patch("/tutors/:id/reject", auth_default("ADMIN" /* ADMIN */), AdminController.rejectTutor);
var adminRouter = router5;

// src/modules/reviews/review.routes.ts
import { Router as Router6 } from "express";

// src/modules/reviews/review.validation.ts
import { z as z5 } from "zod/v4";
var createReviewSchema = z5.object({
  bookingId: z5.string().uuid("Invalid booking ID"),
  rating: z5.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z5.string().min(1, "Comment is required")
});

// src/modules/reviews/review.controller.ts
var createReview2 = async (req, res) => {
  try {
    const parsed = createReviewSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await ReviewService.createReview(userId, parsed);
    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getTutorReviews3 = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const result = await ReviewService.getTutorReviews(tutorId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getPublicReviews2 = async (_req, res) => {
  try {
    const result = await ReviewService.getPublicReviews();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getStudentReviews2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await ReviewService.getStudentReviews(userId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var getTutorOwnReviews = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error("Tutor profile not found");
    const result = await ReviewService.getTutorReviews(profile.id, true);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var toggleVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new Error("Unauthorized");
    const result = await ReviewService.toggleReviewVisibility(
      id,
      userId,
      role
    );
    res.status(200).json({
      success: true,
      message: result.isHidden ? "Review hidden" : "Review visible",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({ success: false, message: error.message });
  }
};
var ReviewController = {
  createReview: createReview2,
  getPublicReviews: getPublicReviews2,
  getTutorReviews: getTutorReviews3,
  getTutorOwnReviews,
  getStudentReviews: getStudentReviews2,
  toggleVisibility
};

// src/modules/reviews/review.routes.ts
var router6 = Router6();
router6.post("/", auth_default("STUDENT" /* STUDENT */, "ADMIN" /* ADMIN */), ReviewController.createReview);
router6.get("/", ReviewController.getPublicReviews);
router6.get("/tutor-me", auth_default("TUTOR" /* TUTOR */), ReviewController.getTutorOwnReviews);
router6.get("/tutor/:tutorId", ReviewController.getTutorReviews);
router6.get("/student", auth_default("STUDENT" /* STUDENT */, "ADMIN" /* ADMIN */), ReviewController.getStudentReviews);
router6.patch("/:id/visibility", auth_default("TUTOR" /* TUTOR */, "ADMIN" /* ADMIN */), ReviewController.toggleVisibility);
var reviewRouter = router6;

// src/modules/availability/availability.routes.ts
import { Router as Router7 } from "express";

// src/modules/availability/availability.validation.ts
import { z as z6 } from "zod/v4";
var createAvailabilitySchema = z6.object({
  dayOfWeek: z6.number().int().min(0).max(6, "Day of week must be 0-6 (Sunday-Saturday)"),
  startTime: z6.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format (HH:MM)"),
  endTime: z6.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format (HH:MM)")
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time"
});
var updateAvailabilitySchema = z6.object({
  id: z6.string().uuid("Invalid availability ID"),
  dayOfWeek: z6.number().int().min(0).max(6).optional(),
  startTime: z6.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z6.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
});
var deleteAvailabilitySchema = z6.object({
  id: z6.string().uuid("Invalid availability ID")
});
var bulkUpdateAvailabilitySchema = z6.object({
  slots: z6.array(createAvailabilitySchema)
});

// src/modules/availability/availability.controller.ts
var createAvailability2 = async (req, res) => {
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
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var getTutorAvailability3 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await AvailabilityService.getTutorAvailability(userId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var updateAvailability2 = async (req, res) => {
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
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var deleteAvailability2 = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await AvailabilityService.deleteAvailability(userId, id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var getPublicTutorAvailability2 = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const result = await AvailabilityService.getPublicTutorAvailability(tutorId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
var AvailabilityController = {
  createAvailability: createAvailability2,
  getTutorAvailability: getTutorAvailability3,
  updateAvailability: updateAvailability2,
  deleteAvailability: deleteAvailability2,
  getPublicTutorAvailability: getPublicTutorAvailability2
};

// src/modules/availability/availability.routes.ts
var router7 = Router7();
router7.post("/", auth_default("TUTOR" /* TUTOR */), AvailabilityController.createAvailability);
router7.get("/", auth_default("TUTOR" /* TUTOR */), AvailabilityController.getTutorAvailability);
router7.put("/", auth_default("TUTOR" /* TUTOR */), AvailabilityController.updateAvailability);
router7.delete("/:id", auth_default("TUTOR" /* TUTOR */), AvailabilityController.deleteAvailability);
router7.get("/tutor/:tutorId", AvailabilityController.getPublicTutorAvailability);
var availabilityRouter = router7;

// src/middlewares/notFound.ts
function notFound(req, res) {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    date: Date()
  });
}

// src/middlewares/globalErrorHandler.ts
import { Prisma as Prisma2 } from "@prisma/client";
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let errorMessage = "Internal Server Error";
  let errorDetails = err;
  if (err instanceof Prisma2.PrismaClientValidationError) {
    statusCode = 400;
    errorMessage = "You provide incorrect field type or missing fields!";
  } else if (err instanceof Prisma2.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      statusCode = 404;
      errorMessage = "The requested item was not found.";
    } else if (err.code === "P2002") {
      statusCode = 409;
      errorMessage = "This information already exists. Please use a different value.";
    } else if (err.code === "P2003") {
      statusCode = 400;
      errorMessage = "The selected item does not exist anymore.";
    } else if (err.code === "P2001") {
      statusCode = 404;
      errorMessage = "We could not find what you were looking for.";
    } else if (err.code === "P2000") {
      statusCode = 400;
      errorMessage = "One of the inputs is too long. Please shorten it and try again.";
    } else if (err.code === "P2004") {
      statusCode = 400;
      errorMessage = "Invalid input. Please check your information and try again.";
    }
  } else if (err instanceof Prisma2.PrismaClientUnknownRequestError) {
    statusCode = 500;
    errorMessage = "Something went wrong on our side. Please try again later.";
  } else if (err instanceof Prisma2.PrismaClientRustPanicError) {
    statusCode = 503;
    errorMessage = "Our service is temporarily unavailable. Please try again later.";
  } else if (err instanceof Prisma2.PrismaClientInitializationError) {
    statusCode = 503;
    if (err.errorCode === "P1000") {
      errorMessage = "Our service is temporarily unavailable. Please try again later.";
    } else if (err.errorCode === "P1001") {
      errorMessage = "Cannot connect to the database. Please try again later.";
    } else {
      errorMessage = "Our service is temporarily unavailable. Please try again later.";
    }
  } else if (err instanceof Error) {
    statusCode = getHttpStatusFromMessage(err.message);
    errorMessage = err.message;
  }
  res.status(statusCode);
  res.json({
    success: false,
    message: errorMessage,
    ...process.env.NODE_ENV === "development" && { error: errorDetails }
  });
}
var globalErrorHandler_default = errorHandler;

// src/modules/users/user.routes.ts
import { Router as Router8 } from "express";

// src/modules/users/user.service.ts
var getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      tutorProfile: {
        select: {
          id: true,
          bio: true,
          subjects: true,
          rating: true,
          price: true
        }
      }
    }
  });
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};
var updateProfile = async (userId, payload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) {
    throw new Error("User not found");
  }
  return await prisma.user.update({
    where: { id: userId },
    data: {
      ...payload.name !== void 0 && { name: payload.name },
      ...payload.image ? { image: payload.image } : { image: null }
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true
    }
  });
};
var UserService = {
  getCurrentUser,
  updateProfile
};

// src/modules/users/user.validation.ts
import { z as z7 } from "zod/v4";
var updateProfileSchema = z7.object({
  name: z7.string().min(1, "Name is required").optional(),
  // Empty string means "clear the image"; a non-empty value must be a valid URL
  image: z7.preprocess(
    (v) => v === "" ? null : v,
    z7.string().url("Image must be a valid URL").nullable().optional()
  )
});
var updateUserRoleSchema = z7.object({
  role: z7.enum(["STUDENT", "TUTOR", "ADMIN"])
});

// src/modules/users/user.controller.ts
var getCurrentUser2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const result = await UserService.getCurrentUser(userId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = getHttpStatusFromMessage(error.message);
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};
var updateProfile2 = async (req, res) => {
  try {
    const parsed = updateProfileSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const result = await UserService.updateProfile(userId, parsed);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var UserController = {
  getCurrentUser: getCurrentUser2,
  updateProfile: updateProfile2
};

// src/modules/users/user.routes.ts
var router8 = Router8();
router8.get("/me", auth_default(), UserController.getCurrentUser);
router8.put("/me", auth_default(), UserController.updateProfile);
router8.put("/profile", auth_default(), UserController.updateProfile);
var userRouter = router8;

// src/modules/upload/upload.routes.ts
import { Router as Router9 } from "express";

// src/modules/upload/upload.controller.ts
var uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    const result = await ImageUploadService.fromMulterFile(
      req.file,
      req.body.preset
    );
    res.status(200).json({
      success: true,
      message: "Image optimized and uploaded",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    res.status(400).json({ success: false, message });
  }
};
var uploadImageFromUrl = async (req, res) => {
  try {
    const { url, preset } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "Image URL is required" });
    }
    const result = await ImageUploadService.fromUrl(url, preset);
    res.status(200).json({
      success: true,
      message: "Image optimized and uploaded",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload failed";
    res.status(400).json({ success: false, message });
  }
};
var UploadController = { uploadImage, uploadImageFromUrl };

// src/modules/upload/upload.routes.ts
var router9 = Router9();
router9.post(
  "/image",
  auth_default(),
  uploadSingleImage("image"),
  UploadController.uploadImage
);
router9.post("/image/from-url", auth_default(), UploadController.uploadImageFromUrl);
var uploadRouter = router9;

// src/routes.ts
app_default.use("/categories", categoryRouter);
app_default.use("/courses", courseRouter);
app_default.use("/mentors", tutorRouter);
app_default.use("/bookings", bookingRouter);
app_default.use("/admin", adminRouter);
app_default.use("/reviews", reviewRouter);
app_default.use("/availability", availabilityRouter);
app_default.use("/users", userRouter);
app_default.use("/upload", uploadRouter);
app_default.use(notFound);
app_default.use(globalErrorHandler_default);

// api/handler.ts
var handler_default = app_default;
export {
  handler_default as default
};
