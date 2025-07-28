import express, { Router } from "express";

const router: express.Router = Router();

// Root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Krapi API Server is running",
    version: "1.0.0",
    documentation: "See UNIFIED_API_DOCUMENTATION.md for the new API structure",
    endpoints: {
      // Krapi API (current)
      krapi: {
        base: "/krapi/v1",
        health: "GET /krapi/v1/health",
        auth: "POST /krapi/v1/auth",
        api: "POST /krapi/v1/api (all operations)",
      },
    },
  });
});

export default router;
