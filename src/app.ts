import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

const app: Application = express();

app.disable("x-powered-by");

const parseOriginList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...parseOriginList(process.env.APP_URL),
    "http://localhost:3000",
    "https://skil-bridge-client-v2.vercel.app",
  ]),
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
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.get("/", (req, res) => {
  res.send("SkillBridge API is running");
});

app.use((req, res, next) => {
  if (req.method !== "GET") {
    next();
    return;
  }

  const isDashboardRequest =
    req.query.dashboard !== undefined ||
    Boolean(req.headers.cookie) ||
    Boolean(req.headers.authorization);

  if (isDashboardRequest || req.path.endsWith("/availability")) {
    res.setHeader("Cache-Control", "no-store");
    next();
    return;
  }

  const PUBLIC_CACHEABLE_ROUTES = [
    "/categories",
    "/courses/popular",
    "/reviews",
  ];

  const COURSE_ROUTE_REGEX = /^\/courses(?:\/[^/]+)?$/;

  const MENTOR_ROUTE_REGEX = /^\/mentors(?:\/[^/]+)?$/;

  const isPublicListOrDetail =
    PUBLIC_CACHEABLE_ROUTES.includes(req.path) ||
    COURSE_ROUTE_REGEX.test(req.path) ||
    MENTOR_ROUTE_REGEX.test(req.path);

  if (isPublicListOrDetail) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=45, stale-while-revalidate=300",
    );
  }

  next();
});

export default app;
