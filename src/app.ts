import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { notFound } from "./middlewares/notFound";
import errorHandler from "./middlewares/globalErrorHandler";
import { categoryRouter } from "./modules/categories/category.routes";
import { tutorRouter } from "./modules/tutors/tutor.routes";
import { bookingRouter } from "./modules/bookings/booking.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { reviewRouter } from "./modules/reviews/review.routes";
import { availabilityRouter } from "./modules/availability/availability.routes";
import { userRouter } from "./modules/users/user.routes";

const app: Application = express();

app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/", (req, res) => {
  res.send("SkillBridge API is running");
});

app.use("/categories", categoryRouter);
app.use("/mentors", tutorRouter);
app.use("/bookings", bookingRouter);
app.use("/admin", adminRouter);
app.use("/reviews", reviewRouter);
app.use("/availability", availabilityRouter);
app.use("/users", userRouter);

app.use(notFound);
app.use(errorHandler);

export default app;