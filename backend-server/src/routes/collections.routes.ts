/**
 * Collections Routes
 * 
 * **STATUS: DISABLED**
 * 
 * Collections routes are currently disabled. All collection operations are handled
 * through project routes at /krapi/k1/projects/:projectId/collections/*.
 * 
 * This file is kept for future reference but no routes are currently active.
 * 
 * @module routes/collections.routes
 * @deprecated Collections are handled by project routes - use /projects/:projectId/collections/* instead
 */
import { BackendSDK } from "@krapi/sdk";
import { Router } from "express";

const router = Router();

// Initialize the BackendSDK - will be set from app.ts
let _backendSDK: BackendSDK;

/**
 * Initialize BackendSDK for collections routes
 * 
 * Currently unused - collections are handled by project routes.
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 * @deprecated Collections are handled by project routes
 */
export const initializeCollectionsSDK = (sdk: BackendSDK) => {
  _backendSDK = sdk;
  // Note: Collections are handled by project routes, not these routes
};

// These routes are not currently used - collections are handled by project routes
// Keeping the file for future reference but routes are disabled

export default router;
