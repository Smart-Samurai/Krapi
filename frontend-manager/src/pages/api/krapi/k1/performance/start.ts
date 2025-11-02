import { krapi } from "@krapi/sdk";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Start performance monitoring using SDK
    krapi.performance.startMonitoring();

    res.status(200).json({
      success: true,
      monitoring_id: `monitor_${Date.now()}`,
      active: true,
      message: "Performance monitoring started",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to start performance monitoring",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

