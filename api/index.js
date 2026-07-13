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
      "https://skil-bridge-client-v2.vercel.app",
      "https://skil-bridge-server-v2.vercel.app"
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
          from: '"MentorForge" <mentorforge.noreply@gmail.com>',
          to: user.email,
          subject: "Reset your password",
          html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Reset your password \u2013 MentorForge</title>
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
                    <h1>MentorForge</h1>
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
                    <p>Stay secure,<br /><strong>MentorForge Team</strong></p>
                  </div>
                  <div class="footer">\xA9 2026 <strong>MentorForge</strong>. All rights reserved.<br />Learn. Grow. Succeed.</div>
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
          from: '"MentorForge" <mentorforge.noreply@gmail.com>',
          to: user.email,
          subject: "Verify your email address",
          html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Verify your email \u2013 MentorForge</title>
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
                    <h1>MentorForge</h1>
                    <p>Connect with expert tutors, learn anything</p>
                  </div>

                  <!-- Content -->
                  <div class="content">
                    <h2>Verify your email address</h2>

                    <p>
                      Hello <strong>${user.name}</strong>,
                    </p>

                    <p>
                      Welcome to <strong>MentorForge</strong> \u{1F393}
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
                      If you didn\u2019t create an account on MentorForge, you can safely ignore
                      this email.
                    </p>

                    <p>
                      Happy learning,<br />
                      <strong>MentorForge Team</strong>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    \xA9 2026 <strong>MentorForge</strong>. All rights reserved.<br />
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
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  },
  secret: process.env.BETTER_AUTH_SECRET
});

// src/app.ts
var app = express();
app.disable("x-powered-by");
var parseOriginList = (value) => (value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
var allowedOrigins = Array.from(
  /* @__PURE__ */ new Set([
    ...parseOriginList(process.env.APP_URL),
    "http://localhost:3000",
    "https://skil-bridge-client-v2.vercel.app"
  ])
);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
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
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.get("/", (req, res) => {
  res.send("MentorForge API is running");
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
  const PUBLIC_CACHEABLE_ROUTES = [
    "/categories",
    "/courses/popular",
    "/reviews"
  ];
  const COURSE_ROUTE_REGEX = /^\/courses(?:\/[^/]+)?$/;
  const MENTOR_ROUTE_REGEX = /^\/mentors(?:\/[^/]+)?$/;
  const isPublicListOrDetail = PUBLIC_CACHEABLE_ROUTES.includes(req.path) || COURSE_ROUTE_REGEX.test(req.path) || MENTOR_ROUTE_REGEX.test(req.path);
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
import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";

// src/lib/image/image.optimizer.ts
import sharp from "sharp";

// src/lib/image/image.presets.ts
var IMAGE_PRESETS = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 82,
    cloudinaryFolder: "mentorforge/avatars"
  },
  course: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 78,
    cloudinaryFolder: "mentorforge/courses"
  },
  category: {
    maxWidth: 900,
    maxHeight: 506,
    quality: 76,
    cloudinaryFolder: "mentorforge/categories"
  },
  general: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 78,
    cloudinaryFolder: "mentorforge/uploads"
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
    const { data, info: info2 } = await encoder.toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      format,
      mimeType: format === "avif" ? "image/avif" : "image/webp",
      extension: format,
      width: info2.width,
      height: info2.height
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
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private or local image URLs are not allowed");
  }
  const [firstAddress] = addresses;
  if (!firstAddress || firstAddress.family !== 4 && firstAddress.family !== 6) {
    throw new Error("Image URL host could not be resolved safely");
  }
  return {
    url: parsed.toString(),
    address: firstAddress.address,
    family: firstAddress.family
  };
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
    const safeLookup = (hostname, options, callback) => {
      callback(null, { address: safeUrl.address, family: safeUrl.family });
    };
    const response = await axios.get(safeUrl.url, {
      responseType: "arraybuffer",
      maxContentLength: MAX_SOURCE_BYTES,
      maxBodyLength: MAX_SOURCE_BYTES,
      maxRedirects: 0,
      lookup: safeLookup,
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

// src/modules/notifications/notification.service.ts
var createNotification = async ({
  userId,
  title,
  message,
  type,
  link,
  entityId
}) => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link: link ?? null,
      entityId: entityId ?? null
    }
  });
};
var createNotifications = async (notifications) => {
  if (notifications.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: notifications.map((notification) => ({
      ...notification,
      link: notification.link ?? null,
      entityId: notification.entityId ?? null
    }))
  });
};
var notifyAdmins = async (payload) => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true }
  });
  return createNotifications(
    admins.map((admin) => ({ ...payload, userId: admin.id }))
  );
};
var getMyNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
};
var markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId }
  });
  if (!notification) {
    throw new Error("Notification not found");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true }
  });
};
var markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};
var deleteNotification = async (notificationId, userId) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId }
  });
  if (!notification) {
    throw new Error("Notification not found");
  }
  return prisma.notification.delete({ where: { id: notificationId } });
};
var NotificationService = {
  createNotification,
  createNotifications,
  notifyAdmins,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};

// src/helpers/paginationSortingHelper.ts
var paginationSortingHelper = (options) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "createdAt";
  const sortOrder = options.sortOrder || "desc";
  return { page, limit, skip, sortBy, sortOrder };
};
var paginationSortingHelper_default = paginationSortingHelper;

// src/modules/courses/course.service.ts
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
  },
  _count: { select: { wishlists: true } }
};
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
  const { page, limit, skip, sortBy, sortOrder } = paginationSortingHelper_default({
    page: filters.page,
    limit: filters.limit,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });
  const where = {
    ...filters.popular && { isPopular: true },
    ...filters.categoryId && { categoryId: filters.categoryId },
    ...filters.createdById && { createdById: filters.createdById },
    ...filters.tutorId && { tutorId: filters.tutorId },
    ...filters.mineUserId && filters.mineRole === "TUTOR" && {
      tutorId: filters.mineUserId
    },
    ...filters.mineUserId && filters.mineRole === "ADMIN" && {
      createdById: filters.mineUserId
    },
    ...filters.search && {
      OR: [
        { title: { contains: filters.search, mode: "insensitive" } },
        {
          description: {
            contains: filters.search,
            mode: "insensitive"
          }
        },
        {
          category: {
            name: { contains: filters.search, mode: "insensitive" }
          }
        },
        {
          tutor: {
            name: { contains: filters.search, mode: "insensitive" }
          }
        }
      ]
    }
  };
  const orderBy = sortBy === "title" ? [{ title: sortOrder }] : sortBy === "category" ? [{ category: { name: sortOrder } }] : sortBy === "popular" ? [{ isPopular: sortOrder }] : [{ createdAt: sortOrder }];
  const [data, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      include: courseInclude,
      orderBy,
      skip,
      take: limit
    }),
    prisma.course.count({ where })
  ]);
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
};
var getCourseList = async (filters = {}) => {
  const result = await getAllCourses({
    ...filters,
    page: 1,
    limit: 100
  });
  return result.data;
};
var getFeaturedCourses = async () => {
  return prisma.course.findMany({
    where: { isPopular: true },
    include: courseInclude,
    orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
    take: 12
  });
};
var getSingleCourse = async (id) => {
  const course = await prisma.course.findUnique({
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
  const course = await prisma.course.create({
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
  if (role === "ADMIN") {
    await NotificationService.createNotification({
      userId: tutorId,
      title: "Course Assigned",
      message: `You have been assigned as instructor for ${course.title}`,
      type: "COURSE_ASSIGNED",
      link: "/tutor/courses",
      entityId: course.id
    });
  }
  return course;
};
var updateCourse = async (id, userId, role, payload) => {
  const course = await prisma.course.findUnique({ where: { id } });
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
  const updatedCourse = await prisma.course.update({
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
  if (role === "ADMIN" && tutorId !== void 0 && tutorId !== course.tutorId) {
    await NotificationService.createNotification({
      userId: tutorId,
      title: "Course Assigned",
      message: `You have been assigned as instructor for ${updatedCourse.title}`,
      type: "COURSE_ASSIGNED",
      link: "/tutor/courses",
      entityId: updatedCourse.id
    });
  }
  return updatedCourse;
};
var deleteCourse = async (id, userId, role) => {
  const course = await prisma.course.findUnique({ where: { id } });
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
  const course = await prisma.course.findUnique({
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
  await NotificationService.notifyAdmins({
    title: "Course Delete Request",
    message: `${request.requester.name} requested to delete ${request.course.title}`,
    type: "COURSE_DELETE_REQUEST",
    link: "/admin/courses",
    entityId: request.id
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
    where: { id: requestId },
    include: {
      course: { select: { title: true } }
    }
  });
  if (!request) throw new Error("Delete request not found");
  if (request.status !== CourseDeleteRequestStatus.PENDING) {
    throw new Error("Delete request has already been resolved");
  }
  if (action === "REJECTED") {
    const rejected = await prisma.courseDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: CourseDeleteRequestStatus.REJECTED,
        resolvedById: adminId,
        resolvedAt: /* @__PURE__ */ new Date()
      }
    });
    await NotificationService.createNotification({
      userId: request.requesterId,
      title: "Course Delete Rejected",
      message: `Your delete request for ${request.course.title} was rejected`,
      type: "COURSE_DELETE_REJECTED",
      link: "/tutor/courses",
      entityId: request.id
    });
    return rejected;
  }
  const approved = await prisma.$transaction(async (tx) => {
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
  await NotificationService.createNotification({
    userId: request.requesterId,
    title: "Course Delete Approved",
    message: `Your delete request for ${request.course.title} was approved`,
    type: "COURSE_DELETE_APPROVED",
    link: "/tutor/courses",
    entityId: request.id
  });
  return approved;
};
var togglePopular = async (id, isPopular) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error("Course not found");
  return prisma.course.update({
    where: { id },
    data: { isPopular },
    include: courseInclude
  });
};
var CourseService = {
  getAllCourses,
  getCourseList,
  getFeaturedCourses,
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
    const search = req.query.search;
    const sortBy = req.query.sortBy;
    const sortOrder = req.query.sortOrder === "asc" || req.query.sortOrder === "desc" ? req.query.sortOrder : void 0;
    if (mine && !req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const filters = {
      ...popular && { popular: true },
      ...categoryId && { categoryId },
      ...search && { search },
      ...req.query.page && { page: req.query.page },
      ...req.query.limit && { limit: req.query.limit },
      ...sortBy && { sortBy },
      ...sortOrder && { sortOrder },
      ...mine && req.user?.id && req.user?.role && { mineUserId: req.user.id, mineRole: req.user.role }
    };
    const result = await CourseService.getAllCourses(filters);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
var getPopularCourses = async (req, res) => {
  try {
    const result = await CourseService.getFeaturedCourses();
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
      reviews: true,
      _count: { select: { wishlists: true } }
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
      availabilities: true,
      _count: { select: { wishlists: true } }
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
  await NotificationService.createNotification({
    userId: result.booking.tutor.user.id,
    title: "New Review Received",
    message: `${result.booking.student.name} left a review`,
    type: "NEW_REVIEW",
    link: "/tutor/reviews",
    entityId: result.id
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

// src/modules/certificates/certificate.service.ts
import crypto2 from "crypto";

// src/modules/certificates/certificate.template.ts
import QRCode from "qrcode";
var escapePdfText = (text3) => String(text3).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
var safeText = (text3, maxLength = 92) => {
  const normalized = String(text3 ?? "N/A").replace(/[^\x20-\x7E]/g, "");
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized || "N/A";
};
var text = (value, x, y, size = 12, font = "F1", maxLength = 92) => `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(
  safeText(value, maxLength)
)}) Tj ET`;
var coloredText = (value, x, y, size, font, color, maxLength = 92) => `${color.join(" ")} rg
${text(value, x, y, size, font, maxLength)}`;
var estimateTextWidth = (value, size, font = "F1") => {
  const weight = font === "F2" ? 0.58 : font === "F3" ? 0.5 : 0.52;
  return safeText(value).length * size * weight;
};
var centeredText = (value, centerX, y, size, font, color, maxLength = 92) => {
  const displayValue = safeText(value, maxLength);
  const x = centerX - estimateTextWidth(displayValue, size, font) / 2;
  return coloredText(displayValue, x, y, size, font, color, maxLength);
};
var rect = (x, y, width, height, color) => `${color.join(" ")} rg ${x} ${y} ${width} ${height} re f`;
var line = (x1, y1, x2, y2, width, color) => `${color.join(" ")} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
var strokeRect = (x, y, width, height, lineWidth, color) => `${color.join(" ")} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`;
var renderQrCode = (value, x, y, size = 86) => {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const cells = qr.modules.size;
  const cell = size / cells;
  const blocks = [rect(x, y, size, size, [1, 1, 1])];
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const isDark = Boolean(qr.modules.data[row * cells + col]);
      if (isDark) {
        blocks.push(
          rect(
            x + col * cell,
            y + (cells - row - 1) * cell,
            cell + 0.15,
            cell + 0.15,
            [0.02, 0.04, 0.08]
          )
        );
      }
    }
  }
  blocks.push(strokeRect(x, y, size, size, 1.2, [0.88, 0.72, 0.32]));
  return blocks.join("\n");
};
var buildPdf = (contentLines) => {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(
      contentLines,
      "utf8"
    )} >>
stream
${contentLines}
endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj
${object}
endobj
`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref
0 ${objects.length + 1}
`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n 
`;
  });
  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;
  return Buffer.from(pdf, "utf8");
};
function renderCertificatePdf(certificate) {
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(
    "en-BD",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
  const instructor = certificate.course.tutor?.name ?? "MentorForge Instructor";
  const category = certificate.course.category?.name ?? "Professional Learning";
  const centerX = 421;
  const contentLines = [
    rect(0, 0, 842, 595, [0.98, 0.97, 0.93]),
    strokeRect(28, 28, 786, 539, 2.5, [0.74, 0.52, 0.18]),
    strokeRect(42, 42, 758, 511, 0.9, [0.86, 0.72, 0.36]),
    rect(60, 505, 722, 2, [0.74, 0.52, 0.18]),
    rect(60, 86, 722, 2, [0.74, 0.52, 0.18]),
    centeredText("MentorForge", centerX, 522, 25, "F2", [0.38, 0.12, 0.41], 32),
    centeredText("Official MentorForge Certification", centerX, 496, 10, "F1", [0.47, 0.38, 0.22], 48),
    centeredText("Certificate of Completion", centerX, 436, 30, "F2", [0.05, 0.08, 0.16], 46),
    centeredText("This certificate is proudly awarded to", centerX, 398, 12, "F1", [0.39, 0.45, 0.55], 54),
    centeredText(certificate.student.name, centerX, 352, 34, "F3", [0.38, 0.12, 0.41], 42),
    line(263, 336, 579, 336, 1, [0.78, 0.62, 0.26]),
    centeredText("for successfully completing", centerX, 296, 12, "F1", [0.39, 0.45, 0.55], 48),
    centeredText(certificate.course.title, centerX, 260, 23, "F2", [0.05, 0.08, 0.16], 52),
    centeredText(category, centerX, 234, 11, "F1", [0.43, 0.29, 0.09], 38),
    coloredText("Issued Date", 112, 160, 9, "F2", [0.39, 0.45, 0.55], 24),
    coloredText(issuedDate, 112, 140, 12, "F2", [0.05, 0.08, 0.16], 34),
    coloredText("Certificate No", 356, 160, 9, "F2", [0.39, 0.45, 0.55], 24),
    coloredText(certificate.certificateNo, 356, 140, 12, "F2", [0.05, 0.08, 0.16], 36),
    coloredText("Instructor", 624, 160, 9, "F2", [0.39, 0.45, 0.55], 24),
    coloredText(instructor, 624, 140, 12, "F2", [0.05, 0.08, 0.16], 32),
    line(612, 130, 748, 130, 1, [0.78, 0.62, 0.26]),
    renderQrCode(certificate.verificationUrl, 664, 412, 76),
    centeredText("Scan to Verify", 702, 397, 8, "F2", [0.39, 0.45, 0.55], 20),
    coloredText(certificate.verificationUrl, 542, 65, 8, "F1", [0.39, 0.45, 0.55], 58)
  ].join("\n");
  return buildPdf(contentLines);
}

// src/modules/certificates/certificate.service.ts
var certificateInclude = {
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
        select: {
          id: true,
          name: true
        }
      },
      tutor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  }
};
var getFrontendUrl = () => process.env.APP_URL || "http://localhost:3000";
var buildVerificationUrl = (certificateNo) => `${getFrontendUrl()}/certificate/${encodeURIComponent(certificateNo)}`;
var createCertificateNo = () => `MENTORFORGE-${crypto2.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
var issueCertificate = async (studentId, courseId) => {
  const existing = await prisma.certificate.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId
      }
    },
    include: certificateInclude
  });
  if (existing) {
    return existing;
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.certificate.create({
        data: {
          studentId,
          courseId,
          certificateNo: createCertificateNo()
        },
        include: certificateInclude
      });
    } catch (error) {
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }
  throw new Error("Could not generate a unique certificate number");
};
var issueForCompletedBooking = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      studentId: true,
      courseId: true,
      status: true
    }
  });
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (booking.status !== "COMPLETED") {
    throw new Error("Certificate can only be issued for completed bookings");
  }
  if (!booking.courseId) {
    throw new Error("This booking has no course assigned");
  }
  return issueCertificate(booking.studentId, booking.courseId);
};
var getCertificateByCourse = async (studentId, courseId) => {
  const certificate = await prisma.certificate.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId
      }
    },
    include: certificateInclude
  });
  if (certificate) {
    return certificate;
  }
  const completedBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      courseId,
      status: "COMPLETED"
    },
    select: { id: true }
  });
  if (!completedBooking) {
    throw new Error("Complete this course before downloading a certificate");
  }
  return issueCertificate(studentId, courseId);
};
var getCertificateById = async (id, userId, role) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: certificateInclude
  });
  if (!certificate) {
    throw new Error("Certificate not found");
  }
  if (role === "STUDENT" && certificate.studentId !== userId) {
    throw new Error("Unauthorized");
  }
  if (role === "TUTOR" && certificate.course.tutorId !== userId) {
    throw new Error("Unauthorized");
  }
  return certificate;
};
var getCertificateByNumber = async (certificateNo) => {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNo },
    include: certificateInclude
  });
  if (!certificate) {
    throw new Error("Certificate not found");
  }
  return certificate;
};
var getCertificates = async (userId, role) => {
  if (role === "ADMIN") {
    return prisma.certificate.findMany({
      include: certificateInclude,
      orderBy: { issuedAt: "desc" }
    });
  }
  if (role === "TUTOR") {
    return prisma.certificate.findMany({
      where: {
        course: {
          tutorId: userId
        }
      },
      include: certificateInclude,
      orderBy: { issuedAt: "desc" }
    });
  }
  return prisma.certificate.findMany({
    where: { studentId: userId },
    include: certificateInclude,
    orderBy: { issuedAt: "desc" }
  });
};
var createCertificatePdf = async (certificateId, userId, role) => {
  const certificate = await getCertificateById(certificateId, userId, role);
  const buffer = renderCertificatePdf({
    certificateNo: certificate.certificateNo,
    issuedAt: certificate.issuedAt,
    verificationUrl: buildVerificationUrl(certificate.certificateNo),
    student: {
      name: certificate.student.name
    },
    course: {
      title: certificate.course.title,
      tutor: {
        name: certificate.course.tutor?.name ?? null
      },
      category: certificate.course.category
    }
  });
  return {
    filename: `mentorforge-certificate-${certificate.certificateNo}.pdf`,
    buffer
  };
};
var CertificateService = {
  issueCertificate,
  issueForCompletedBooking,
  getCertificateByCourse,
  getCertificateById,
  getCertificateByNumber,
  getCertificates,
  createCertificatePdf,
  buildVerificationUrl
};

// src/services/googleCalendar.service.ts
import { randomUUID as randomUUID2 } from "crypto";
import { google } from "googleapis";

// src/utils/logger.ts
var isProduction = process.env.NODE_ENV === "production";
var formatContext = (context) => context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";
var logger = {
  error(message, error, context) {
    if (isProduction) {
      return;
    }
    const errorMessage = error instanceof Error ? error.message : String(error ?? "");
    process.stderr.write(`[error] ${message}${formatContext(context)} ${errorMessage}
`);
  },
  info(message, context) {
    if (isProduction) {
      return;
    }
    process.stdout.write(`[info] ${message}${formatContext(context)}
`);
  }
};

// src/services/googleCalendar.service.ts
var CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
var SESSION_DURATION_MINUTES = 60;
var getRedirectUrl = () => {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";
  return `${baseUrl}/api/auth/callback/google`;
};
var getCalendarAccount = async (userId) => {
  return prisma.account.findFirst({
    where: {
      userId,
      providerId: "google",
      OR: [{ accessToken: { not: null } }, { refreshToken: { not: null } }]
    },
    select: {
      id: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      scope: true
    }
  });
};
var hasCalendarAccess = (scope) => {
  return Boolean(scope?.split(/\s+/).includes(CALENDAR_SCOPE));
};
var getCalendarClient = async (userId) => {
  const account = await getCalendarAccount(userId);
  if (!account || !hasCalendarAccess(account.scope)) {
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUrl()
  );
  oauth2Client.setCredentials({
    access_token: account.accessToken ?? null,
    refresh_token: account.refreshToken ?? null
  });
  return {
    account,
    oauth2Client,
    calendar: google.calendar({ version: "v3", auth: oauth2Client })
  };
};
var persistRefreshedTokens = async (accountId, credentials) => {
  const data = {};
  if (credentials.access_token) {
    data.accessToken = credentials.access_token;
  }
  if (credentials.refresh_token) {
    data.refreshToken = credentials.refresh_token;
  }
  if (Object.keys(data).length > 0) {
    await prisma.account.update({
      where: { id: accountId },
      data
    });
  }
};
var createBookingCalendarEvent = async (bookingId) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        tutor: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        course: { select: { title: true } }
      }
    });
    if (!booking || booking.status !== "CONFIRMED") {
      return null;
    }
    if (booking.googleEventId) {
      return booking;
    }
    const calendarClient = await getCalendarClient(booking.tutor.userId) ?? await getCalendarClient(booking.studentId);
    if (!calendarClient) {
      return null;
    }
    const startDate = new Date(booking.dateTime);
    const endDate = new Date(
      startDate.getTime() + SESSION_DURATION_MINUTES * 60 * 1e3
    );
    const courseTitle = booking.course?.title ?? "MentorForge Session";
    const event = await calendarClient.calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: `${courseTitle} Session`,
        description: `MentorForge tutor booking session.

Student: ${booking.student.name}
Tutor: ${booking.tutor.user.name}`,
        start: {
          dateTime: startDate.toISOString()
        },
        end: {
          dateTime: endDate.toISOString()
        },
        attendees: [
          { email: booking.student.email, displayName: booking.student.name },
          {
            email: booking.tutor.user.email,
            displayName: booking.tutor.user.name
          }
        ],
        conferenceData: {
          createRequest: {
            requestId: randomUUID2(),
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 1440 },
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 15 }
          ]
        }
      }
    });
    await persistRefreshedTokens(
      calendarClient.account.id,
      calendarClient.oauth2Client.credentials
    );
    return prisma.booking.update({
      where: { id: booking.id },
      data: {
        googleEventId: event.data.id ?? null,
        googleEventCreatorUserId: calendarClient.account.userId,
        meetingLink: event.data.hangoutLink ?? null
      }
    });
  } catch (error) {
    logger.error("Failed to create Google Calendar event", error, { bookingId });
    return null;
  }
};
var deleteBookingCalendarEvent = async (bookingId) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        googleEventId: true,
        googleEventCreatorUserId: true
      }
    });
    if (!booking?.googleEventId || !booking.googleEventCreatorUserId) {
      return null;
    }
    const calendarClient = await getCalendarClient(
      booking.googleEventCreatorUserId
    );
    if (!calendarClient) {
      return null;
    }
    await calendarClient.calendar.events.delete({
      calendarId: "primary",
      eventId: booking.googleEventId,
      sendUpdates: "all"
    });
    await persistRefreshedTokens(
      calendarClient.account.id,
      calendarClient.oauth2Client.credentials
    );
    return prisma.booking.update({
      where: { id: booking.id },
      data: {
        googleEventId: null,
        googleEventCreatorUserId: null,
        meetingLink: null
      }
    });
  } catch (error) {
    logger.error("Failed to delete Google Calendar event", error, { bookingId });
    return null;
  }
};
var GoogleCalendarService = {
  createBookingCalendarEvent,
  deleteBookingCalendarEvent
};

// src/modules/bookings/booking.service.ts
var ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED
];
var hasSessionStarted = (dateTime) => dateTime.getTime() <= Date.now();
var ensurePendingBooking = (booking) => {
  if (booking.status !== BookingStatus.PENDING) {
    throw new Error("Only pending bookings can be confirmed");
  }
};
var ensureConfirmedBooking = (booking) => {
  if (booking.status !== BookingStatus.CONFIRMED) {
    throw new Error("Only confirmed sessions can be marked as completed");
  }
};
var ensureSessionCanBeCompleted = (booking) => {
  ensureConfirmedBooking(booking);
  if (!hasSessionStarted(booking.dateTime)) {
    throw new Error("Session cannot be completed before its scheduled time");
  }
};
var ensureAdminCanCancelBooking = (booking) => {
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new Error("Only pending or confirmed bookings can be cancelled");
  }
};
var paymentSelect = {
  id: true,
  bookingId: true,
  status: true,
  gateway: true,
  amount: true,
  currency: true,
  transactionId: true,
  createdAt: true
};
var attachPaymentsToBookings = async (bookings) => {
  if (bookings.length === 0) {
    return bookings.map((booking) => ({ ...booking, payment: null }));
  }
  const payments = await prisma.payment.findMany({
    where: { bookingId: { in: bookings.map((booking) => booking.id) } },
    select: paymentSelect
  });
  const paymentByBookingId = new Map(
    payments.filter((payment) => payment.bookingId).map((payment) => [payment.bookingId, payment])
  );
  return bookings.map((booking) => ({
    ...booking,
    payment: paymentByBookingId.get(booking.id) ?? null
  }));
};
var ensureBookingPaymentPaid = async (bookingId) => {
  const payment = await prisma.payment.findFirst({
    where: { bookingId },
    select: { status: true }
  });
  if (payment?.status !== "PAID") {
    throw new Error("Payment must be completed before confirming this booking");
  }
};
var getBookingNotificationContext = async (bookingId) => {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { id: true, name: true } },
      tutor: {
        include: {
          user: { select: { id: true, name: true } }
        }
      },
      course: { select: { id: true, title: true } }
    }
  });
};
var notifyBookingCreated = async (bookingId) => {
  const booking = await getBookingNotificationContext(bookingId);
  if (!booking) return null;
  return NotificationService.createNotification({
    userId: booking.tutor.userId,
    title: "New Booking Request",
    message: `${booking.student.name} booked ${booking.course?.title ?? "a session"}`,
    type: "BOOKING_CREATED",
    link: "/tutor/sessions",
    entityId: booking.id
  });
};
var validateBookingRequest = async (studentId, payload) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: payload.tutorId },
    include: {
      user: { select: { name: true, status: true } }
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
    select: { id: true, title: true }
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
  const conflicting = await prisma.booking.findFirst({
    where: {
      tutorId: payload.tutorId,
      dateTime: bookingDate,
      status: { in: [...ACTIVE_BOOKING_STATUSES] }
    }
  });
  if (conflicting) {
    throw new Error("This time slot is already booked");
  }
  return {
    tutor,
    course,
    slot,
    bookingDate,
    amount: tutor.price
  };
};
var createBooking = async (studentId, payload) => {
  const { bookingDate } = await validateBookingRequest(studentId, payload);
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
    await notifyBookingCreated(result.id);
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new Error("This time slot is already booked");
    }
    throw error;
  }
};
var getStudentBookings = async (studentId) => {
  const bookings = await prisma.booking.findMany({
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
  return attachPaymentsToBookings(bookings);
};
var getTutorBookings = async (tutorId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: tutorId }
  });
  if (!tutorProfile) {
    throw new Error("Tutor profile not found");
  }
  const bookings = await prisma.booking.findMany({
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
  return attachPaymentsToBookings(bookings);
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
  const [bookingWithPayment] = await attachPaymentsToBookings([booking]);
  return bookingWithPayment;
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
    if (status === "CONFIRMED") {
      ensurePendingBooking(booking);
      if (hasSessionStarted(booking.dateTime)) {
        throw new Error("Past sessions cannot be confirmed");
      }
      await ensureBookingPaymentPaid(bookingId);
    }
    if (status === "CANCELLED") {
      ensureAdminCanCancelBooking(booking);
    }
    if (status === "COMPLETED") {
      ensureSessionCanBeCompleted(booking);
    }
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });
    if (status === "CONFIRMED") {
      await NotificationService.createNotification({
        userId: updatedBooking.studentId,
        title: "Booking Confirmed",
        message: "Your booking has been confirmed",
        type: "BOOKING_CONFIRMED",
        link: "/dashboard/bookings",
        entityId: updatedBooking.id
      });
      const calendarBooking = await GoogleCalendarService.createBookingCalendarEvent(
        updatedBooking.id
      );
      return calendarBooking ?? updatedBooking;
    }
    if (status === "CANCELLED") {
      await GoogleCalendarService.deleteBookingCalendarEvent(updatedBooking.id);
      await NotificationService.createNotifications([
        {
          userId: updatedBooking.studentId,
          title: "Booking Cancelled",
          message: "Your booking was cancelled",
          type: "BOOKING_CANCELLED",
          link: "/dashboard/bookings",
          entityId: updatedBooking.id
        }
      ]);
    }
    if (status === "COMPLETED" && updatedBooking.courseId) {
      await CertificateService.issueForCompletedBooking(bookingId);
      await NotificationService.createNotification({
        userId: updatedBooking.studentId,
        title: "Session Completed",
        message: "You can now leave a review and download your certificate",
        type: "SESSION_COMPLETED",
        link: "/dashboard/bookings",
        entityId: updatedBooking.id
      });
    }
    return updatedBooking;
  }
  if (status === "CANCELLED" && role === "STUDENT") {
    if (booking.status !== "PENDING") {
      throw new Error("Only pending bookings can be cancelled by students");
    }
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    }).then(async (cancelledBooking) => {
      const context = await getBookingNotificationContext(cancelledBooking.id);
      if (context) {
        await NotificationService.createNotification({
          userId: context.tutor.userId,
          title: "Booking Cancelled",
          message: `${context.student.name} cancelled the booking`,
          type: "BOOKING_CANCELLED",
          link: "/tutor/sessions",
          entityId: cancelledBooking.id
        });
      }
      const bookingWithoutCalendar = await GoogleCalendarService.deleteBookingCalendarEvent(
        cancelledBooking.id
      );
      return bookingWithoutCalendar ?? cancelledBooking;
    });
  }
  if (role === "TUTOR") {
    if (status === "CONFIRMED") {
      ensurePendingBooking(booking);
      if (hasSessionStarted(booking.dateTime)) {
        throw new Error("Past sessions cannot be confirmed");
      }
      await ensureBookingPaymentPaid(bookingId);
      const confirmedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" }
      });
      await NotificationService.createNotification({
        userId: confirmedBooking.studentId,
        title: "Booking Confirmed",
        message: "Your booking has been confirmed",
        type: "BOOKING_CONFIRMED",
        link: "/dashboard/bookings",
        entityId: confirmedBooking.id
      });
      const calendarBooking = await GoogleCalendarService.createBookingCalendarEvent(
        confirmedBooking.id
      );
      return calendarBooking ?? confirmedBooking;
    }
    if (status === "COMPLETED") {
      ensureSessionCanBeCompleted(booking);
      const completedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" }
      });
      if (completedBooking.courseId) {
        await CertificateService.issueForCompletedBooking(bookingId);
      }
      await NotificationService.createNotification({
        userId: completedBooking.studentId,
        title: "Session Completed",
        message: "You can now leave a review and download your certificate",
        type: "SESSION_COMPLETED",
        link: "/dashboard/bookings",
        entityId: completedBooking.id
      });
      return completedBooking;
    }
  }
  throw new Error("Invalid status update");
};
var getAllBookings = async () => {
  const bookings = await prisma.booking.findMany({
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
  return attachPaymentsToBookings(bookings);
};
var BookingService = {
  createBooking,
  validateBookingRequest,
  getStudentBookings,
  getTutorBookings,
  getSingleBooking,
  updateBookingStatus,
  getAllBookings,
  attachPaymentsToBookings,
  notifyBookingCreated
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
  const bookings = await prisma.booking.findMany({
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
  return BookingService.attachPaymentsToBookings(bookings);
};
var getDashboardStats = async () => {
  const sixMonthsAgo = /* @__PURE__ */ new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const [
    totalUsers,
    totalTutors,
    totalStudents,
    totalBookings,
    totalCategories,
    paidRevenue,
    paidPayments,
    bookingStatusGroups,
    courses,
    tutors
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.booking.count(),
    prisma.category.count(),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true }
    }),
    prisma.payment.findMany({
      where: { status: "PAID", createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true, tutorId: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { status: true }
    }),
    prisma.course.findMany({
      include: {
        category: { select: { name: true } },
        tutor: { select: { name: true } },
        _count: { select: { bookings: true, wishlists: true } }
      }
    }),
    prisma.tutorProfile.findMany({
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { bookings: true, reviews: true, wishlists: true } }
      }
    })
  ]);
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(sixMonthsAgo);
    date.setMonth(sixMonthsAgo.getMonth() + index);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const total = paidPayments.filter((payment) => {
      const paymentDate = new Date(payment.createdAt);
      return `${paymentDate.getFullYear()}-${paymentDate.getMonth()}` === key;
    }).reduce((sum, payment) => sum + payment.amount, 0);
    return {
      month: monthFormatter.format(date),
      revenue: total
    };
  });
  const bookingStatusData = bookingStatusGroups.map((item) => ({
    status: item.status,
    count: item._count.status
  }));
  const revenueByTutorId = paidPayments.reduce(
    (acc, payment) => {
      acc[payment.tutorId] = (acc[payment.tutorId] ?? 0) + payment.amount;
      return acc;
    },
    {}
  );
  const popularCourses = courses.map((course) => ({
    id: course.id,
    title: course.title,
    category: course.category.name,
    tutor: course.tutor?.name ?? "Unassigned",
    bookings: course._count.bookings,
    saved: course._count.wishlists
  })).sort((a, b) => b.bookings + b.saved - (a.bookings + a.saved)).slice(0, 6);
  const topTutors = tutors.map((tutor) => ({
    id: tutor.id,
    userId: tutor.userId,
    name: tutor.user.name,
    image: tutor.user.image,
    rating: tutor.rating,
    bookings: tutor._count.bookings,
    reviews: tutor._count.reviews,
    saved: tutor._count.wishlists,
    revenue: revenueByTutorId[tutor.id] ?? 0
  })).sort((a, b) => b.revenue + b.bookings - (a.revenue + a.bookings)).slice(0, 6);
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
    revenue: paidRevenue._sum.amount ?? 0,
    monthlyRevenue,
    bookingStatusData,
    popularCourses,
    topTutors,
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
  const approvedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
    select: { id: true, name: true, email: true, role: true, status: true }
  });
  await NotificationService.createNotification({
    userId,
    title: "Tutor Request Approved",
    message: "You are now an approved tutor on MentorForge",
    type: "TUTOR_REQUEST_APPROVED",
    link: "/tutor/dashboard",
    entityId: userId
  });
  return approvedUser;
};
var rejectTutor = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "TUTOR") throw new Error("User is not a tutor");
  if (user.status !== UserStatus.PENDING)
    throw new Error("User is not pending approval");
  const rejectedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.REJECTED },
    select: { id: true, name: true, email: true, role: true, status: true }
  });
  await NotificationService.createNotification({
    userId,
    title: "Tutor Request Rejected",
    message: "Your tutor request was rejected. Please contact support for details.",
    type: "TUTOR_REQUEST_REJECTED",
    link: "/dashboard/profile",
    entityId: userId
  });
  return rejectedUser;
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
  price: z4.coerce.number().min(100, "Price must be at least \u09F3100 for Stripe payment")
});
var createTutorSchema = z4.object({
  name: z4.string().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or less"),
  email: z4.string().email("Invalid email address"),
  bio: z4.string().min(10, "Bio must be at least 10 characters").max(1e3, "Bio must be 1000 characters or less"),
  subjects: z4.array(z4.string().min(1)).min(1, "At least one subject is required"),
  price: z4.coerce.number().min(100, "Price must be at least \u09F3100 for Stripe payment")
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

// src/modules/payments/payment.routes.ts
import { Router as Router10 } from "express";

// src/modules/payments/payment.service.ts
import Stripe from "stripe";
import { Prisma as Prisma3 } from "@prisma/client";

// src/modules/payments/invoice.template.ts
var escapePdfText2 = (text3) => String(text3).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
var safeText2 = (text3, maxLength = 80) => {
  const normalized = String(text3 ?? "N/A").replace(/[^\x20-\x7E]/g, "");
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized || "N/A";
};
var text2 = (value, x, y, size = 10, font = "F1", maxLength = 80) => `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText2(
  safeText2(value, maxLength)
)}) Tj ET`;
var coloredText2 = (value, x, y, size, font, color, maxLength = 80) => `${color.join(" ")} rg
${text2(value, x, y, size, font, maxLength)}`;
var rect2 = (x, y, width, height, color) => `${color.join(" ")} rg ${x} ${y} ${width} ${height} re f`;
var lerp = (a, b, t) => a + (b - a) * t;
var gradientRect = (x, y, width, height, from, mid, to, steps = 140) => {
  const sliceWidth = width / steps;
  return Array.from({ length: steps }).map((_, i) => {
    const t = i / (steps - 1);
    const color = t < 0.5 ? [
      lerp(from[0], mid[0], t * 2),
      lerp(from[1], mid[1], t * 2),
      lerp(from[2], mid[2], t * 2)
    ] : [
      lerp(mid[0], to[0], (t - 0.5) * 2),
      lerp(mid[1], to[1], (t - 0.5) * 2),
      lerp(mid[2], to[2], (t - 0.5) * 2)
    ];
    return rect2(x + i * sliceWidth, y, sliceWidth + 0.8, height, color);
  }).join("\n");
};
var roundedRect = (x, y, width, height, radius, color, mode = "fill") => {
  const op = mode === "fill" ? "f" : "S";
  const colorOp = mode === "fill" ? "rg" : "RG";
  const x2 = x + width;
  const y2 = y + height;
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `${color.join(" ")} ${colorOp}`,
    `${x + r} ${y} m`,
    `${x2 - r} ${y} l`,
    `${x2} ${y} ${x2} ${y} ${x2} ${y + r} c`,
    `${x2} ${y2 - r} l`,
    `${x2} ${y2} ${x2} ${y2} ${x2 - r} ${y2} c`,
    `${x + r} ${y2} l`,
    `${x} ${y2} ${x} ${y2} ${x} ${y2 - r} c`,
    `${x} ${y + r} l`,
    `${x} ${y} ${x} ${y} ${x + r} ${y} c`,
    `h ${op}`
  ].join("\n");
};
var info = (label, value, x, y, width = 46) => [
  coloredText2(label.toUpperCase(), x, y, 7, "F2", [0.5, 0.58, 0.72], width),
  coloredText2(value, x, y - 16, 9, "F2", [0.02, 0.04, 0.08], width)
].join("\n");
var courseRow = (label, value, y) => [
  coloredText2(label, 46, y, 9, "F1", [0.36, 0.45, 0.58], 28),
  coloredText2(value, 318, y, 9, "F2", [0.02, 0.04, 0.08], 42)
].join("\n");
var buildPdf2 = (contentLines) => {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(
      contentLines,
      "utf8"
    )} >>
stream
${contentLines}
endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj
${object}
endobj
`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref
0 ${objects.length + 1}
`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n 
`;
  });
  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;
  return Buffer.from(pdf, "utf8");
};
function renderInvoicePdf(payment) {
  const invoiceId = `INV-${payment.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(payment.createdAt).toLocaleString("en-BD");
  const sessionDate = payment.booking?.dateTime ? new Date(payment.booking.dateTime).toLocaleString("en-BD") : payment.date;
  const amount = `${payment.currency.toUpperCase()} ${payment.amount}`;
  const contentLines = [
    // Page background
    rect2(0, 0, 612, 792, [1, 1, 1]),
    // Smooth gradient header
    gradientRect(
      0,
      690,
      612,
      102,
      [0.39, 0.32, 0.94],
      [0.71, 0.16, 0.88],
      [0.35, 0.13, 0.84],
      160
    ),
    // Header text
    coloredText2("MentorForge Invoice", 28, 742, 20, "F2", [1, 1, 1], 34),
    coloredText2(
      "Thank you for learning with MentorForge.",
      28,
      722,
      8,
      "F1",
      [0.9, 0.9, 1],
      52
    ),
    // Paid badge
    roundedRect(520, 732, 58, 28, 14, [0.28, 0.42, 0.82]),
    coloredText2(payment.status, 535, 742, 8, "F2", [1, 1, 1], 12),
    // Invoice meta
    info("Invoice ID", invoiceId, 28, 660, 28),
    info("Transaction ID", payment.transactionId, 312, 660, 34),
    info("Gateway", payment.gateway, 28, 615, 24),
    info("Invoice Date", invoiceDate, 312, 615, 30),
    rect2(0, 570, 612, 1, [0.86, 0.89, 0.93]),
    // Student card
    roundedRect(28, 402, 268, 136, 14, [0.98, 0.99, 1]),
    roundedRect(28, 402, 268, 136, 14, [0.84, 0.88, 0.93], "stroke"),
    // Session card
    roundedRect(316, 402, 268, 136, 14, [0.98, 0.99, 1]),
    roundedRect(316, 402, 268, 136, 14, [0.84, 0.88, 0.93], "stroke"),
    coloredText2("STUDENT DETAILS", 46, 510, 7, "F2", [0.36, 0.48, 0.7], 24),
    info("Name", payment.student?.name ?? "N/A", 46, 480, 30),
    info("Email", payment.student?.email ?? "N/A", 46, 440, 34),
    coloredText2("SESSION DETAILS", 334, 510, 7, "F2", [0.36, 0.48, 0.7], 24),
    info("Tutor", payment.tutor?.user?.name ?? "N/A", 334, 480, 28),
    info("Session Date", sessionDate, 334, 440, 30),
    // Course summary card
    roundedRect(28, 222, 556, 160, 14, [1, 1, 1]),
    roundedRect(28, 222, 556, 160, 14, [0.84, 0.88, 0.93], "stroke"),
    // Header
    rect2(28, 326, 556, 56, [0.98, 0.99, 1]),
    coloredText2("Course Summary", 46, 352, 10, "F2", [0.02, 0.06, 0.12], 30),
    // Divider lines
    rect2(28, 326, 556, 1, [0.86, 0.89, 0.94]),
    rect2(28, 286, 556, 1, [0.86, 0.89, 0.94]),
    rect2(28, 246, 556, 1, [0.86, 0.89, 0.94]),
    // Rows text
    courseRow("Course", payment.course?.title ?? "N/A", 304),
    courseRow("Category", payment.course?.category?.name ?? "N/A", 264),
    courseRow(
      "Booking Status",
      payment.booking?.status ?? "Not created yet",
      232
    ),
    // Total paid box
    roundedRect(28, 72, 556, 102, 18, [0.01, 0.03, 0.1]),
    coloredText2("Total Paid", 46, 135, 10, "F1", [1, 1, 1], 20),
    coloredText2(amount, 46, 100, 26, "F2", [1, 1, 1], 22),
    // Payment small card
    roundedRect(476, 94, 82, 64, 10, [0.12, 0.15, 0.25]),
    coloredText2("Payment", 494, 130, 8, "F1", [1, 1, 1], 14),
    coloredText2(payment.status, 502, 110, 9, "F2", [0.13, 0.9, 0.55], 12),
    // Footer
    coloredText2(
      "This invoice confirms your MentorForge booking and payment record.",
      130,
      38,
      8,
      "F1",
      [0.34, 0.44, 0.62],
      62
    )
  ].join("\n");
  return buildPdf2(contentLines);
}

// src/modules/payments/payment.service.ts
var ZERO_DECIMAL_CURRENCIES = /* @__PURE__ */ new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf"
]);
var getApiBaseUrl = () => process.env.API_PUBLIC_URL || process.env.BETTER_AUTH_URL || "http://localhost:5000";
var getFrontendUrl2 = () => process.env.APP_URL || "http://localhost:3000";
var getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured");
  }
  return new Stripe(secretKey);
};
var getCurrency = () => (process.env.STRIPE_CURRENCY || "bdt").trim().toLowerCase();
var toStripeUnitAmount = (amount, currency) => ZERO_DECIMAL_CURRENCIES.has(currency) ? amount : amount * 100;
var buildTransactionId = () => `SB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
var initiatePayment = async (studentId, payload) => {
  const stripe = getStripe();
  const currency = getCurrency();
  const { tutor, course, amount } = await BookingService.validateBookingRequest(
    studentId,
    payload
  );
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, email: true }
  });
  if (!student) {
    throw new Error("Student not found");
  }
  const transactionId = buildTransactionId();
  const payment = await prisma.payment.create({
    data: {
      transactionId,
      gateway: "STRIPE",
      amount,
      currency,
      studentId,
      tutorId: payload.tutorId,
      courseId: payload.courseId,
      availabilityId: payload.availabilityId,
      date: payload.date
    }
  });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: student.email,
    success_url: `${getApiBaseUrl()}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getApiBaseUrl()}/payments/cancel?payment_id=${payment.id}`,
    metadata: {
      paymentId: payment.id,
      transactionId,
      studentId,
      tutorProfileId: payload.tutorId,
      tutorUserId: tutor.userId,
      courseId: payload.courseId,
      availabilityId: payload.availabilityId,
      date: payload.date
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toStripeUnitAmount(amount, currency),
          product_data: {
            name: course.title,
            description: `MentorForge session with ${tutor.user?.name ?? "Tutor"}`
          }
        }
      }
    ]
  });
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayTransactionId: session.id,
      gatewayPayload: session
    }
  });
  if (!session.url) {
    throw new Error("Stripe checkout URL was not returned");
  }
  return {
    transactionId,
    amount,
    currency,
    paymentUrl: session.url,
    cancelUrl: `${getFrontendUrl2()}/dashboard/bookings?payment=cancelled`
  };
};
var createBookingAfterPayment = async (sessionId) => {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new Error("Stripe payment is not completed");
  }
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) {
    throw new Error("Payment record not found in Stripe metadata");
  }
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });
  if (!payment) {
    throw new Error("Payment record not found");
  }
  if (payment.status === "PAID" && payment.bookingId) {
    return await prisma.booking.findUnique({ where: { id: payment.bookingId } });
  }
  if (payment.status === "CANCELLED") {
    throw new Error("Payment was cancelled");
  }
  if (payment.status === "FAILED") {
    throw new Error("Payment failed");
  }
  const payload = {
    tutorId: payment.tutorId,
    courseId: payment.courseId,
    availabilityId: payment.availabilityId,
    date: payment.date
  };
  const { bookingDate } = await BookingService.validateBookingRequest(
    payment.studentId,
    payload
  );
  const booking = await prisma.$transaction(
    async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id: payment.id }
      });
      if (existingPayment?.bookingId) {
        return await tx.booking.findUnique({
          where: { id: existingPayment.bookingId }
        });
      }
      const conflicting = await tx.booking.findFirst({
        where: {
          tutorId: payment.tutorId,
          dateTime: bookingDate,
          status: { in: ["PENDING", "CONFIRMED"] }
        }
      });
      if (conflicting) {
        throw new Error("This time slot is already booked");
      }
      const booking2 = await tx.booking.create({
        data: {
          studentId: payment.studentId,
          tutorId: payment.tutorId,
          courseId: payment.courseId,
          dateTime: bookingDate,
          status: "PENDING"
        }
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          bookingId: booking2.id,
          gatewayTransactionId: session.id,
          validationId: session.payment_intent?.toString() ?? null,
          gatewayPayload: session
        }
      });
      return booking2;
    },
    { isolationLevel: Prisma3.TransactionIsolationLevel.Serializable }
  );
  if (booking?.id) {
    await BookingService.notifyBookingCreated(booking.id);
  }
  return booking;
};
var markPaymentCancelled = async (paymentId) => {
  if (!paymentId) return null;
  return await prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: "INITIATED"
    },
    data: { status: "CANCELLED" }
  });
};
var buildPaymentWhere = async ({ userId, role }) => {
  if (role === "ADMIN") return {};
  if (role === "STUDENT") return { studentId: userId };
  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile) {
      throw new Error("Tutor profile not found");
    }
    return { tutorId: tutorProfile.id };
  }
  throw new Error("Unauthorized");
};
var enrichPayments = async (payments) => {
  const studentIds = Array.from(new Set(payments.map((item) => item.studentId)));
  const tutorIds = Array.from(new Set(payments.map((item) => item.tutorId)));
  const courseIds = Array.from(new Set(payments.map((item) => item.courseId)));
  const bookingIds = Array.from(
    new Set(payments.map((item) => item.bookingId).filter(Boolean))
  );
  const [students, tutors, courses, bookings] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, email: true, image: true }
    }),
    prisma.tutorProfile.findMany({
      where: { id: { in: tutorIds } },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      }
    }),
    prisma.course.findMany({
      where: { id: { in: courseIds } },
      include: { category: { select: { id: true, name: true } } }
    }),
    prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { id: true, status: true, dateTime: true }
    })
  ]);
  const studentMap = new Map(students.map((item) => [item.id, item]));
  const tutorMap = new Map(tutors.map((item) => [item.id, item]));
  const courseMap = new Map(courses.map((item) => [item.id, item]));
  const bookingMap = new Map(bookings.map((item) => [item.id, item]));
  return payments.map((payment) => ({
    ...payment,
    student: studentMap.get(payment.studentId) ?? null,
    tutor: tutorMap.get(payment.tutorId) ?? null,
    course: courseMap.get(payment.courseId) ?? null,
    booking: payment.bookingId ? bookingMap.get(payment.bookingId) ?? null : null
  }));
};
var getPaymentHistory = async (scope) => {
  const where = await buildPaymentWhere(scope);
  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
  return await enrichPayments(payments);
};
var getPaymentForInvoice = async (paymentId, userId, role) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (role === "STUDENT" && payment.studentId !== userId) {
    throw new Error("Unauthorized");
  }
  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile || tutorProfile.id !== payment.tutorId) {
      throw new Error("Unauthorized");
    }
  }
  const [enriched] = await enrichPayments([payment]);
  if (!enriched) {
    throw new Error("Payment not found");
  }
  return enriched;
};
var createInvoicePdf = async (paymentId, userId, role) => {
  const payment = await getPaymentForInvoice(paymentId, userId, role);
  return {
    filename: `mentorforge-invoice-${payment.transactionId}.pdf`,
    buffer: renderInvoicePdf(payment)
  };
};
var PaymentService = {
  initiatePayment,
  createBookingAfterPayment,
  markPaymentCancelled,
  getPaymentHistory,
  createInvoicePdf
};

// src/modules/payments/payment.validation.ts
import { z as z8 } from "zod/v4";
var initiatePaymentSchema = createBookingSchema;
var stripeSuccessSchema = z8.object({
  session_id: z8.string().min(1, "Missing Stripe checkout session ID")
});
var stripeCancelSchema = z8.object({
  payment_id: z8.string().optional()
});

// src/modules/payments/payment.controller.ts
var getFrontendUrl3 = () => process.env.APP_URL || "http://localhost:3000";
var initiatePayment2 = async (req, res) => {
  try {
    const parsed = initiatePaymentSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const result = await PaymentService.initiatePayment(userId, parsed);
    res.status(201).json({
      success: true,
      message: "Payment session created. Redirect the student to payment.",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var paymentSuccess = async (req, res) => {
  const frontendUrl = getFrontendUrl3();
  try {
    const parsed = stripeSuccessSchema.parse(req.query);
    const booking = await PaymentService.createBookingAfterPayment(parsed.session_id);
    res.redirect(
      `${frontendUrl}/dashboard/bookings?payment=success&bookingId=${booking?.id ?? ""}`
    );
  } catch (error) {
    res.redirect(
      `${frontendUrl}/dashboard/bookings?payment=failed&message=${encodeURIComponent(
        error.message || "Payment failed"
      )}`
    );
  }
};
var paymentCancel = async (req, res) => {
  try {
    const parsed = stripeCancelSchema.parse(req.query);
    await PaymentService.markPaymentCancelled(parsed.payment_id);
    res.redirect(`${getFrontendUrl3()}/dashboard/bookings?payment=cancelled`);
  } catch (error) {
    res.redirect(
      `${getFrontendUrl3()}/dashboard/bookings?payment=failed&message=${encodeURIComponent(
        error.message || "Payment cancellation failed"
      )}`
    );
  }
};
var getPaymentHistory2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new Error("Unauthorized");
    }
    const result = await PaymentService.getPaymentHistory({ userId, role });
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
var downloadInvoice = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!id || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }
    const invoice = await PaymentService.createInvoicePdf(id, userId, role);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.filename}"`
    );
    res.status(200).send(invoice.buffer);
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var PaymentController = {
  initiatePayment: initiatePayment2,
  paymentSuccess,
  paymentCancel,
  getPaymentHistory: getPaymentHistory2,
  downloadInvoice
};

// src/modules/payments/payment.routes.ts
var router10 = Router10();
router10.post("/initiate", auth_default("STUDENT" /* STUDENT */), PaymentController.initiatePayment);
router10.get("/", auth_default(), PaymentController.getPaymentHistory);
router10.get("/:id/invoice", auth_default(), PaymentController.downloadInvoice);
router10.get("/success", PaymentController.paymentSuccess);
router10.get("/cancel", PaymentController.paymentCancel);
var paymentRouter = router10;

// src/modules/certificates/certificate.routes.ts
import { Router as Router11 } from "express";

// src/modules/certificates/certificate.controller.ts
var getCertificates2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new Error("Unauthorized");
    }
    const result = await CertificateService.getCertificates(userId, role);
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
var getCertificateByCourse2 = async (req, res) => {
  try {
    const rawCourseId = req.params.courseId;
    const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;
    const userId = req.user?.id;
    if (!courseId || !userId) {
      throw new Error("Unauthorized or invalid request");
    }
    const result = await CertificateService.getCertificateByCourse(
      userId,
      courseId
    );
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
var verifyCertificate = async (req, res) => {
  try {
    const rawCertificateNo = req.params.certificateNo;
    const certificateNo = Array.isArray(rawCertificateNo) ? rawCertificateNo[0] : rawCertificateNo;
    if (!certificateNo) {
      throw new Error("Invalid certificate number");
    }
    const certificate = await CertificateService.getCertificateByNumber(certificateNo);
    res.status(200).json({
      success: true,
      message: "Certificate verified",
      data: {
        id: certificate.id,
        certificateNo: certificate.certificateNo,
        issuedAt: certificate.issuedAt,
        student: certificate.student,
        course: certificate.course
      }
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var downloadCertificate = async (req, res) => {
  try {
    const rawCertificateId = req.params.id;
    const certificateId = Array.isArray(rawCertificateId) ? rawCertificateId[0] : rawCertificateId;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!certificateId || !userId || !role) {
      throw new Error("Unauthorized or invalid request");
    }
    const certificate = await CertificateService.createCertificatePdf(
      certificateId,
      userId,
      role
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${certificate.filename}"`
    );
    res.status(200).send(certificate.buffer);
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var CertificateController = {
  getCertificates: getCertificates2,
  getCertificateByCourse: getCertificateByCourse2,
  verifyCertificate,
  downloadCertificate
};

// src/modules/certificates/certificate.routes.ts
var router11 = Router11();
router11.get("/", auth_default(), CertificateController.getCertificates);
router11.get("/verify/:certificateNo", CertificateController.verifyCertificate);
router11.get("/:id/download", auth_default(), CertificateController.downloadCertificate);
router11.get("/:courseId", auth_default(), CertificateController.getCertificateByCourse);
var certificateRouter = router11;

// src/modules/notifications/notification.routes.ts
import { Router as Router12 } from "express";

// src/modules/notifications/notification.controller.ts
var getMyNotifications2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const result = await NotificationService.getMyNotifications(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var markAsRead2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rawId = req.params.id;
    const notificationId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!userId || !notificationId) {
      throw new Error("Unauthorized or invalid request");
    }
    const result = await NotificationService.markAsRead(
      notificationId,
      userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var markAllAsRead2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error("Unauthorized");
    const result = await NotificationService.markAllAsRead(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var deleteNotification2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rawId = req.params.id;
    const notificationId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!userId || !notificationId) {
      throw new Error("Unauthorized or invalid request");
    }
    const result = await NotificationService.deleteNotification(
      notificationId,
      userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var NotificationController = {
  getMyNotifications: getMyNotifications2,
  markAsRead: markAsRead2,
  markAllAsRead: markAllAsRead2,
  deleteNotification: deleteNotification2
};

// src/modules/notifications/notification.routes.ts
var router12 = Router12();
router12.get("/", auth_default(), NotificationController.getMyNotifications);
router12.patch("/read-all", auth_default(), NotificationController.markAllAsRead);
router12.patch("/:id/read", auth_default(), NotificationController.markAsRead);
router12.delete("/:id", auth_default(), NotificationController.deleteNotification);
var notificationRouter = router12;

// src/modules/wishlist/wishlist.routes.ts
import { Router as Router13 } from "express";

// src/modules/wishlist/wishlist.service.ts
var courseInclude2 = {
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
      tutorProfile: { select: { id: true } }
    }
  },
  _count: { select: { wishlists: true } }
};
var tutorInclude = {
  user: true,
  reviews: true,
  _count: { select: { wishlists: true } }
};
var addCourse = async (userId, courseId) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");
  return prisma.wishlist.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId, type: "COURSE" }
  });
};
var addTutor = async (userId, tutorId) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { id: tutorId },
    include: { user: { select: { role: true, status: true } } }
  });
  if (!tutor || tutor.user.role !== "TUTOR" || tutor.user.status !== "ACTIVE") {
    throw new Error("Tutor not found");
  }
  return prisma.wishlist.upsert({
    where: { userId_tutorId: { userId, tutorId } },
    update: {},
    create: { userId, tutorId, type: "TUTOR" }
  });
};
var removeCourse = async (userId, courseId) => {
  return prisma.wishlist.deleteMany({
    where: { userId, courseId, type: "COURSE" }
  });
};
var removeTutor = async (userId, tutorId) => {
  return prisma.wishlist.deleteMany({
    where: { userId, tutorId, type: "TUTOR" }
  });
};
var getWishlist = async (userId) => {
  const [courseItems, tutorItems] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId, type: "COURSE", courseId: { not: null } },
      include: { course: { include: courseInclude2 } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.wishlist.findMany({
      where: { userId, type: "TUTOR", tutorId: { not: null } },
      include: { tutor: { include: tutorInclude } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  return {
    courses: courseItems.flatMap((item) => item.course ? [item.course] : []),
    tutors: tutorItems.flatMap((item) => item.tutor ? [item.tutor] : [])
  };
};
var WishlistService = {
  addCourse,
  addTutor,
  removeCourse,
  removeTutor,
  getWishlist
};

// src/modules/wishlist/wishlist.controller.ts
var getUserId = (req) => {
  const userId = req.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
};
var getParam = (req, key) => {
  const raw = req.params[key];
  return Array.isArray(raw) ? raw[0] : raw;
};
var getWishlist2 = async (req, res) => {
  try {
    const result = await WishlistService.getWishlist(getUserId(req));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var addCourse2 = async (req, res) => {
  try {
    const courseId = getParam(req, "courseId");
    if (!courseId) throw new Error("Invalid course id");
    const result = await WishlistService.addCourse(getUserId(req), courseId);
    res.status(201).json({
      success: true,
      message: "Course added to wishlist",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var addTutor2 = async (req, res) => {
  try {
    const tutorId = getParam(req, "tutorId");
    if (!tutorId) throw new Error("Invalid tutor id");
    const result = await WishlistService.addTutor(getUserId(req), tutorId);
    res.status(201).json({
      success: true,
      message: "Tutor added to wishlist",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var removeCourse2 = async (req, res) => {
  try {
    const courseId = getParam(req, "courseId");
    if (!courseId) throw new Error("Invalid course id");
    const result = await WishlistService.removeCourse(getUserId(req), courseId);
    res.status(200).json({
      success: true,
      message: "Course removed from wishlist",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var removeTutor2 = async (req, res) => {
  try {
    const tutorId = getParam(req, "tutorId");
    if (!tutorId) throw new Error("Invalid tutor id");
    const result = await WishlistService.removeTutor(getUserId(req), tutorId);
    res.status(200).json({
      success: true,
      message: "Tutor removed from wishlist",
      data: result
    });
  } catch (error) {
    res.status(getHttpStatusFromMessage(error.message)).json({
      success: false,
      message: error.message
    });
  }
};
var WishlistController = {
  getWishlist: getWishlist2,
  addCourse: addCourse2,
  addTutor: addTutor2,
  removeCourse: removeCourse2,
  removeTutor: removeTutor2
};

// src/modules/wishlist/wishlist.routes.ts
var router13 = Router13();
router13.get("/", auth_default("STUDENT" /* STUDENT */), WishlistController.getWishlist);
router13.post("/course/:courseId", auth_default("STUDENT" /* STUDENT */), WishlistController.addCourse);
router13.post("/tutor/:tutorId", auth_default("STUDENT" /* STUDENT */), WishlistController.addTutor);
router13.delete("/course/:courseId", auth_default("STUDENT" /* STUDENT */), WishlistController.removeCourse);
router13.delete("/tutor/:tutorId", auth_default("STUDENT" /* STUDENT */), WishlistController.removeTutor);
var wishlistRouter = router13;

// src/modules/search/search.routes.ts
import { Router as Router14 } from "express";

// src/modules/search/search.service.ts
var RESULT_LIMIT = 5;
var normalizeQuery = (query) => {
  return String(query ?? "").trim();
};
var searchEverything = async (rawQuery, role) => {
  const query = normalizeQuery(rawQuery);
  const canSearchUsers = role === "ADMIN";
  if (query.length < 2) {
    return {
      tutors: [],
      courses: [],
      categories: [],
      users: []
    };
  }
  const [tutors, courses, categories, users] = await Promise.all([
    prisma.tutorProfile.findMany({
      take: RESULT_LIMIT,
      where: {
        user: { role: "TUTOR", status: "ACTIVE" },
        OR: [
          { bio: { contains: query, mode: "insensitive" } },
          { subjects: { has: query } },
          { user: { name: { contains: query, mode: "insensitive" } } }
        ]
      },
      select: {
        id: true,
        bio: true,
        subjects: true,
        rating: true,
        user: { select: { name: true, image: true } }
      },
      orderBy: { rating: "desc" }
    }),
    prisma.course.findMany({
      take: RESULT_LIMIT,
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { name: { contains: query, mode: "insensitive" } } },
          { tutor: { name: { contains: query, mode: "insensitive" } } }
        ]
      },
      select: {
        id: true,
        title: true,
        image: true,
        category: { select: { name: true } },
        tutor: { select: { name: true } }
      },
      orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }]
    }),
    prisma.category.findMany({
      take: RESULT_LIMIT,
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        name: true,
        image: true,
        description: true
      },
      orderBy: { name: "asc" }
    }),
    canSearchUsers ? prisma.user.findMany({
      take: RESULT_LIMIT,
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true
      },
      orderBy: { createdAt: "desc" }
    }) : Promise.resolve([])
  ]);
  return {
    tutors: tutors.map((tutor) => ({
      id: tutor.id,
      title: tutor.user.name,
      subtitle: tutor.subjects.slice(0, 3).join(", ") || "Tutor",
      image: tutor.user.image,
      href: `/mentors/${tutor.id}`,
      type: "Tutor"
    })),
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      subtitle: course.category.name,
      image: course.image,
      href: `/courses/${course.id}`,
      type: "Course"
    })),
    categories: categories.map((category) => ({
      id: category.id,
      title: category.name,
      subtitle: category.description ?? "Course category",
      image: category.image,
      href: `/courses?category=${category.id}`,
      type: "Category"
    })),
    users: users.map((user) => ({
      id: user.id,
      title: user.name,
      subtitle: `${user.email} - ${user.role}${user.status ? ` - ${user.status}` : ""}`,
      href: `/admin/users?search=${encodeURIComponent(user.email)}`,
      type: "User"
    }))
  };
};
var SearchService = {
  searchEverything
};

// src/modules/search/search.controller.ts
var searchEverything2 = async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });
    const role = session?.user ? session.user.role : void 0;
    const result = await SearchService.searchEverything(req.query.q, role);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Search failed"
    });
  }
};
var SearchController = {
  searchEverything: searchEverything2
};

// src/modules/search/search.routes.ts
var router14 = Router14();
router14.get("/", SearchController.searchEverything);
var searchRouter = router14;

// src/modules/contact/contact.routes.ts
import { Router as Router15 } from "express";

// src/modules/contact/contact.service.ts
var createMessage = async (payload) => {
  return prisma.contactMessage.create({
    data: payload
  });
};
var getMessages = async () => {
  return prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" }
  });
};
var markAsRead3 = async (id) => {
  return prisma.contactMessage.update({
    where: { id },
    data: { isRead: true }
  });
};
var ContactService = {
  createMessage,
  getMessages,
  markAsRead: markAsRead3
};

// src/modules/contact/contact.validation.ts
import { z as z9 } from "zod";
var createContactMessageSchema = z9.object({
  name: z9.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z9.string().trim().email("Please provide a valid email address").max(120),
  subject: z9.string().trim().min(4, "Subject must be at least 4 characters").max(120),
  message: z9.string().trim().min(10, "Message must be at least 10 characters").max(1200)
});

// src/modules/contact/contact.controller.ts
var createMessage2 = async (req, res) => {
  try {
    const payload = createContactMessageSchema.parse(req.body);
    const result = await ContactService.createMessage(payload);
    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    res.status(400).json({ success: false, message });
  }
};
var getMessages2 = async (_req, res) => {
  try {
    const result = await ContactService.getMessages();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages";
    res.status(400).json({ success: false, message });
  }
};
var markAsRead4 = async (req, res) => {
  try {
    const result = await ContactService.markAsRead(req.params.id);
    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update message";
    res.status(400).json({ success: false, message });
  }
};
var ContactController = {
  createMessage: createMessage2,
  getMessages: getMessages2,
  markAsRead: markAsRead4
};

// src/modules/contact/contact.routes.ts
var router15 = Router15();
router15.post("/", ContactController.createMessage);
router15.get("/", auth_default("ADMIN" /* ADMIN */), ContactController.getMessages);
router15.patch("/:id/read", auth_default("ADMIN" /* ADMIN */), ContactController.markAsRead);
var contactRouter = router15;

// src/modules/blogs/blog.routes.ts
import { Router as Router16 } from "express";

// src/modules/blogs/blog.service.ts
var blogInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true
    }
  }
};
var buildCreateData = (payload, authorId) => ({
  title: payload.title,
  excerpt: payload.excerpt,
  content: payload.content,
  image: payload.image || null,
  tags: payload.tags ?? [],
  isPublished: payload.isPublished ?? true,
  authorId
});
var buildUpdateData = (payload) => ({
  ...payload.title !== void 0 && { title: payload.title },
  ...payload.excerpt !== void 0 && { excerpt: payload.excerpt },
  ...payload.content !== void 0 && { content: payload.content },
  ...payload.image !== void 0 && { image: payload.image || null },
  ...payload.tags !== void 0 && { tags: payload.tags },
  ...payload.isPublished !== void 0 && { isPublished: payload.isPublished }
});
var getPublishedBlogs = async () => {
  return prisma.blogPost.findMany({
    where: { isPublished: true },
    include: blogInclude,
    orderBy: { createdAt: "desc" }
  });
};
var getSinglePublishedBlog = async (id) => {
  const blog = await prisma.blogPost.findFirst({
    where: { id, isPublished: true },
    include: blogInclude
  });
  if (!blog) throw new Error("Blog not found");
  return blog;
};
var getManageBlogs = async (userId, role) => {
  return prisma.blogPost.findMany({
    where: role === "ADMIN" ? {} : { authorId: userId },
    include: blogInclude,
    orderBy: { createdAt: "desc" }
  });
};
var createBlog = async (authorId, payload) => {
  return prisma.blogPost.create({
    data: buildCreateData(payload, authorId),
    include: blogInclude
  });
};
var updateBlog = async (id, userId, role, payload) => {
  const blog = await prisma.blogPost.findUnique({ where: { id } });
  if (!blog) throw new Error("Blog not found");
  if (role !== "ADMIN" && blog.authorId !== userId) {
    throw new Error("You can only edit your own blog posts");
  }
  return prisma.blogPost.update({
    where: { id },
    data: buildUpdateData(payload),
    include: blogInclude
  });
};
var deleteBlog = async (id, userId, role) => {
  const blog = await prisma.blogPost.findUnique({ where: { id } });
  if (!blog) throw new Error("Blog not found");
  if (role !== "ADMIN" && blog.authorId !== userId) {
    throw new Error("You can only delete your own blog posts");
  }
  await prisma.blogPost.delete({ where: { id } });
  return { message: "Blog deleted successfully" };
};
var BlogService = {
  getPublishedBlogs,
  getSinglePublishedBlog,
  getManageBlogs,
  createBlog,
  updateBlog,
  deleteBlog
};

// src/modules/blogs/blog.validation.ts
import { z as z10 } from "zod";
var createBlogSchema = z10.object({
  title: z10.string().trim().min(5, "Title must be at least 5 characters").max(140),
  excerpt: z10.string().trim().min(20, "Excerpt must be at least 20 characters").max(260),
  content: z10.string().trim().min(120, "Content must be at least 120 characters"),
  image: z10.string().trim().url("Image must be a valid URL").optional().or(z10.literal("")),
  tags: z10.array(z10.string().trim().min(1).max(30)).max(8).optional(),
  isPublished: z10.boolean().optional()
});
var updateBlogSchema = createBlogSchema.partial();

// src/modules/blogs/blog.controller.ts
var getPublishedBlogs2 = async (_req, res) => {
  try {
    const result = await BlogService.getPublishedBlogs();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load blogs";
    res.status(400).json({ success: false, message });
  }
};
var getSinglePublishedBlog2 = async (req, res) => {
  try {
    const result = await BlogService.getSinglePublishedBlog(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blog not found";
    res.status(message === "Blog not found" ? 404 : 400).json({ success: false, message });
  }
};
var getManageBlogs2 = async (req, res) => {
  try {
    if (!req.user?.id || !req.user.role) throw new Error("Unauthorized");
    const result = await BlogService.getManageBlogs(req.user.id, req.user.role);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load blogs";
    res.status(400).json({ success: false, message });
  }
};
var createBlog2 = async (req, res) => {
  try {
    if (!req.user?.id) throw new Error("Unauthorized");
    const payload = createBlogSchema.parse(req.body);
    const result = await BlogService.createBlog(req.user.id, payload);
    res.status(201).json({
      success: true,
      message: "Blog published successfully",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish blog";
    res.status(400).json({ success: false, message });
  }
};
var updateBlog2 = async (req, res) => {
  try {
    if (!req.user?.id || !req.user.role) throw new Error("Unauthorized");
    const payload = updateBlogSchema.parse(req.body);
    const result = await BlogService.updateBlog(
      req.params.id,
      req.user.id,
      req.user.role,
      payload
    );
    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update blog";
    res.status(400).json({ success: false, message });
  }
};
var deleteBlog2 = async (req, res) => {
  try {
    if (!req.user?.id || !req.user.role) throw new Error("Unauthorized");
    const result = await BlogService.deleteBlog(
      req.params.id,
      req.user.id,
      req.user.role
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete blog";
    res.status(400).json({ success: false, message });
  }
};
var BlogController = {
  getPublishedBlogs: getPublishedBlogs2,
  getSinglePublishedBlog: getSinglePublishedBlog2,
  getManageBlogs: getManageBlogs2,
  createBlog: createBlog2,
  updateBlog: updateBlog2,
  deleteBlog: deleteBlog2
};

// src/modules/blogs/blog.routes.ts
var router16 = Router16();
router16.get("/", BlogController.getPublishedBlogs);
router16.get("/manage", auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */), BlogController.getManageBlogs);
router16.get("/:id", BlogController.getSinglePublishedBlog);
router16.post("/", auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */), BlogController.createBlog);
router16.patch("/:id", auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */), BlogController.updateBlog);
router16.delete("/:id", auth_default("ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */), BlogController.deleteBlog);
var blogRouter = router16;

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
app_default.use("/payments", paymentRouter);
app_default.use("/certificates", certificateRouter);
app_default.use("/notifications", notificationRouter);
app_default.use("/wishlist", wishlistRouter);
app_default.use("/search", searchRouter);
app_default.use("/contact", contactRouter);
app_default.use("/blogs", blogRouter);
app_default.use(notFound);
app_default.use(globalErrorHandler_default);

// api/handler.ts
var handler_default = app_default;
export {
  handler_default as default
};
