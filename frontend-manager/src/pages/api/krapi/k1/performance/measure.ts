import { NextApiRequest, NextApiResponse } from "next";
import { krapi } from "@krapi/sdk";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { operation, collection_name, metadata } = req.body;

    if (!operation) {
      return res.status(400).json({ error: "Operation is required" });
    }

    // Measure operation performance using SDK
    const metric = await krapi.performance.measureOperation(
      operation,
      collection_name,
      async () => {
        // Simulate operation for measurement
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 100)
        );
        return { success: true, data: "operation completed" };
      },
      metadata
    );

    res.status(200).json(metric);
  } catch (error) {
    console.error("Performance measurement error:", error);
    res.status(500).json({
      error: "Failed to measure operation performance",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

