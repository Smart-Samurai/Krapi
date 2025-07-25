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
        base: "/krapi/k1",
        health: "GET /krapi/k1/health",
        auth: "POST /krapi/k1/auth",
        api: "POST /krapi/k1/api (all operations)",
      },
    },
  });
});

export default router;
