import { categoryRouter } from "./modules/categories/category.routes";
import { courseRouter } from "./modules/courses/course.routes";
import { tutorRouter } from "./modules/tutors/tutor.routes";
import { bookingRouter } from "./modules/bookings/booking.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { reviewRouter } from "./modules/reviews/review.routes";
import { availabilityRouter } from "./modules/availability/availability.routes";
import { notFound } from "./middlewares/notFound";
import errorHandler from "./middlewares/globalErrorHandler";
import app from "./app";
import { userRouter } from "./modules/users/user.routes";
import { uploadRouter } from "./modules/upload/upload.routes";
import { paymentRouter } from "./modules/payments/payment.routes";

app.use("/categories", categoryRouter);
app.use("/courses", courseRouter);
app.use("/mentors", tutorRouter);
app.use("/bookings", bookingRouter);
app.use("/admin", adminRouter);
app.use("/reviews", reviewRouter);
app.use("/availability", availabilityRouter);
app.use("/users", userRouter);
app.use("/upload", uploadRouter);
app.use("/payments", paymentRouter);

app.use(notFound);
app.use(errorHandler);
