import { krapi } from "@krapi/sdk";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { collection } = req.query;

  if (!collection || typeof collection !== "string") {
    return res.status(400).json({ error: "Collection name is required" });
  }

  try {
    const document = req.body;

    if (!document || typeof document !== "object") {
      return res.status(400).json({ error: "Document data is required" });
    }

    // Validate document against custom fields using SDK
    const validationResult = await krapi.metadata.validateDocument(
      collection,
      document
    );

    res.status(200).json(validationResult);
  } catch (error) {
    res.status(500).json({
      error: "Failed to validate document",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

