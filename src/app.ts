import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

const app: Application = express();

const allowedOrigins = Array.from(
  new Set([
    process.env.APP_URL,
    "http://localhost:3000",
    "https://skill-bridge-client-two-beta.vercel.app",
  ].filter(Boolean)),
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
    credentials: true,
  }),
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

  const isDashboardRequest =
    req.query.dashboard !== undefined ||
    Boolean(req.headers.cookie) ||
    Boolean(req.headers.authorization);

  if (isDashboardRequest || req.path.endsWith("/availability")) {
    res.setHeader("Cache-Control", "no-store");
    next();
    return;
  }

  const isPublicListOrDetail =
    req.path === "/categories" ||
    req.path === "/courses/popular" ||
    /^\/courses(?:\/[^/]+)?$/.test(req.path) ||
    /^\/mentors(?:\/[^/]+)?$/.test(req.path) ||
    req.path === "/reviews";

  if (isPublicListOrDetail) {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=45, stale-while-revalidate=300",
    );
  }

  next();
});

export default app;
