import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = 500;
  let errorMessage = "Internal Server Error";
  let errorDetails = err;

  // PrismaClientValidationError
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorMessage = "You provide incorrect field type or missing fields!";
  }

  // PrismaClientKnownRequestError
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      statusCode = 404;
      errorMessage = "The requested item was not found.";
    } else if (err.code === "P2002") {
      statusCode = 409;
      errorMessage =
        "This information already exists. Please use a different value.";
    } else if (err.code === "P2003") {
      statusCode = 400;
      errorMessage = "The selected item does not exist anymore.";
    } else if (err.code === "P2001") {
      statusCode = 404;
      errorMessage = "We could not find what you were looking for.";
    } else if (err.code === "P2000") {
      statusCode = 400;
      errorMessage =
        "One of the inputs is too long. Please shorten it and try again.";
    } else if (err.code === "P2004") {
      statusCode = 400;
      errorMessage =
        "Invalid input. Please check your information and try again.";
    }
  }

  // PrismaClientUnknownRequestError
  else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    errorMessage = "Something went wrong on our side. Please try again later.";
  }

  // PrismaClientRustPanicError
  else if (err instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 503;
    errorMessage =
      "Our service is temporarily unavailable. Please try again later.";

    // PrismaClientInitializationError
  }

  // PrismaClientInitializationError
  else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;

    if (err.errorCode === "P1000") {
      errorMessage =
        "Our service is temporarily unavailable. Please try again later.";
    } else if (err.errorCode === "P1001") {
      errorMessage = "Cannot connect to the database. Please try again later.";
    } else {
      errorMessage =
        "Our service is temporarily unavailable. Please try again later.";
    }

    console.error("Prisma Initialization Error:", err);
  }

  res.status(statusCode);
  res.json({
    message: errorMessage,
    ...(process.env.NODE_ENV === "development" && { error: errorDetails }),
  });
}

export default errorHandler;
