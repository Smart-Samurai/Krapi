/**
 * SDK Client Helper for Test Suite
 * 
 * Provides SDK-based helpers for all test operations.
 * Replaces direct fetch() calls with SDK methods.
 * 
 * @module lib/sdk-client
 */

import { krapi } from "@smartsamurai/krapi-sdk";
import { CONFIG } from "../config.js";

let isConnected = false;
let sessionToken = null;

/**
 * Initialize SDK connection
 * @returns {Promise<void>}
 */
export async function initializeSDK() {
  if (isConnected) {
    return;
  }

  const endpoint = CONFIG.FRONTEND_URL; // Connect to frontend, not backend
  
  await krapi.connect({
    endpoint,
    timeout: 5000,
    initializeClients: true,
  });

  isConnected = true;
}

/**
 * Login as admin using SDK
 * @returns {Promise<string>} Session token
 */
export async function loginAsAdmin() {
  await initializeSDK();

  const loginResult = await krapi.auth.login(
    CONFIG.ADMIN_CREDENTIALS.username,
    CONFIG.ADMIN_CREDENTIALS.password
  );

  if (!loginResult.session_token) {
    throw new Error("No session token received from SDK login");
  }

  sessionToken = loginResult.session_token;

  // Reconnect SDK with session token so ALL HTTP clients have it
  await krapi.connect({
    endpoint: CONFIG.FRONTEND_URL,
    sessionToken,
    initializeClients: true,
    timeout: 5000,
  });

  return sessionToken;
}

/**
 * Get current session token
 * @returns {string|null}
 */
export function getSessionToken() {
  return sessionToken;
}

/**
 * Get SDK instance
 * @returns {typeof krapi}
 */
export function getSDK() {
  if (!isConnected) {
    throw new Error("SDK not initialized. Call initializeSDK() first.");
  }
  return krapi;
}

/**
 * Reset SDK connection (for cleanup)
 */
export function resetSDK() {
  isConnected = false;
  sessionToken = null;
}


