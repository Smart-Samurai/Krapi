import { krapi } from "@krapi/sdk";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { collection } = req.query;

  if (!collection || typeof collection !== "string") {
    return res.status(400).json({ error: "Collection name is required" });
  }

  try {
    switch (req.method) {
      case "GET":
        // Get all custom fields for a collection - method not yet implemented in SDK
        res.status(501).json({ error: "Method not yet implemented" });
        break;

      case "POST":
        // Add a new custom field
        const fieldData = req.body;
        const newField = await krapi.metadata.addCustomField(fieldData);
        res.status(201).json(newField);
        break;

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to manage custom fields",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

