import { NextApiRequest, NextApiResponse } from "next";
import { krapi } from "@krapi/sdk";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { collection, field } = req.query;

  if (!collection || typeof collection !== "string") {
    return res.status(400).json({ error: "Collection name is required" });
  }

  if (!field || typeof field !== "string") {
    return res.status(400).json({ error: "Field name is required" });
  }

  try {
    switch (req.method) {
      case "PUT":
        // Update a custom field
        const updates = req.body;
        const updatedField = await krapi.metadata.updateCustomField(
          collection,
          field,
          updates
        );
        res.status(200).json(updatedField);
        break;

      case "DELETE":
        // Remove a custom field
        const success = await krapi.metadata.removeCustomField(
          collection,
          field
        );
        res.status(200).json({ success });
        break;

      default:
        res.setHeader("Allow", ["PUT", "DELETE"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Custom field management error:", error);
    res.status(500).json({
      error: "Failed to manage custom field",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

