import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserController } from "./user.controller";

const router = Router();

router.get("/me", auth(), UserController.getCurrentUser);
router.put("/me", auth(), UserController.updateProfile);

export const userRouter = router;