import { auth as betterAuth } from "../lib/auth";
import { Request, Response, NextFunction } from "express";

export enum UserRole {
  ADMIN = "ADMIN",
  TUTOR = "TUTOR",
  STUDENT = "STUDENT",
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        emailVerified: boolean;
      };
    }
  }
}

const auth = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await betterAuth.api.getSession({
        headers: req.headers as any,
      });
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!session.user.emailVerified) {
        return res.status(403).json({
          success: false,
          message:
            "Email verification required. Please verify your email to proceed.",
        });
      }

      const status = (session.user as any).status;
      if (status === "PENDING") {
        return res.status(403).json({
          success: false,
          message: "Your account is pending admin approval. You will be notified once approved.",
        });
      }

      if (status === "REJECTED") {
        return res.status(403).json({
          success: false,
          message: "Your tutor application has been rejected. Please contact support for more information.",
        });
      }

      if (status === "BANNED") {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Please contact support.",
        });
      }

      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as string,
        emailVerified: session.user.emailVerified,
      };

      if (roles.length && !roles.includes(req.user.role as UserRole)) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden: You do not have the required permissions to access this resource.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};


export default auth;