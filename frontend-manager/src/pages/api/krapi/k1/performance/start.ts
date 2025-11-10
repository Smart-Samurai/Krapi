import { krapi } from "@smartsamurai/krapi-sdk";
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
    const session = await krapi.performance.start();

    res.status(200).json({
      success: true,
      monitoring_id: session.session_id,
      active: session.status === "active",
      message: "Performance monitoring started",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to start performance monitoring",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

