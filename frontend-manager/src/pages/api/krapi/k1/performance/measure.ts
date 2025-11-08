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
    const { operation, collection_name: _collection_name, metadata } = req.body;

    if (!operation) {
      return res.status(400).json({ error: "Operation is required" });
    }

    // Measure operation performance using SDK
    const metric = await krapi.performance.measure({
      operation,
      duration_ms: 0,
      success: true,
      metadata,
    });

    res.status(200).json(metric);
  } catch (error) {
    res.status(500).json({
      error: "Failed to measure operation performance",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

