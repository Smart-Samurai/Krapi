import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export const validateContentData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { key, data } = req.body;

  if (!key || typeof key !== "string" || key.trim() === "") {
    const response: ApiResponse = {
      success: false,
      error: "Key is required and must be a non-empty string",
    };
    res.status(400).json(response);
    return;
  }

  if (data === undefined || data === null) {
    const response: ApiResponse = {
      success: false,
      error: "Data is required",
    };
    res.status(400).json(response);
    return;
  }

  // Sanitize key - remove special characters except hyphens and underscores
  req.body.key = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "-");

  next();
};

export const validateKeyParam = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { key } = req.params;

  if (!key || typeof key !== "string" || key.trim() === "") {
    const response: ApiResponse = {
      success: false,
      error: "Key parameter is required",
    };
    res.status(400).json(response);
    return;
  }

  next();
};

export const validateUpdateData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { data } = req.body;

  if (data === undefined || data === null) {
    const response: ApiResponse = {
      success: false,
      error: "Data is required",
    };
    res.status(400).json(response);
    return;
  }

  next();
};

export const validateRouteData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { path, name } = req.body;

  if (!path || typeof path !== "string" || path.trim() === "") {
    const response: ApiResponse = {
      success: false,
      error: "Path is required and must be a non-empty string",
    };
    res.status(400).json(response);
    return;
  }

  if (!name || typeof name !== "string" || name.trim() === "") {
    const response: ApiResponse = {
      success: false,
      error: "Name is required and must be a non-empty string",
    };
    res.status(400).json(response);
    return;
  }

  // Ensure path starts with /
  if (!path.startsWith("/")) {
    req.body.path = "/" + path;
  }

  // Sanitize path - remove special characters except hyphens, underscores, and slashes
  req.body.path = req.body.path
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_/]/g, "-")
    .replace(/\/+/g, "/"); // Replace multiple slashes with single slash

  next();
};
