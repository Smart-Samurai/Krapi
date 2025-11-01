import { BackendSDK } from "@krapi/sdk";
import { Router } from "express";

const router = Router();

// Initialize the BackendSDK - will be set from app.ts
let _backendSDK: BackendSDK;

export const initializeCollectionsSDK = (sdk: BackendSDK) => {
  _backendSDK = sdk;
  // Note: Collections are handled by project routes, not these routes
};

// These routes are not currently used - collections are handled by project routes
// Keeping the file for future reference but routes are disabled

export default router;
