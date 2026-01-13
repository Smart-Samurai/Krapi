/**
 * Client Route Generator Utility
 * 
 * Provides helper functions to create client routes that mirror proxy routes.
 * Client routes use SDK to call proxy routes, avoiding circular dependencies.
 */

import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";
import { NextRequest, NextResponse } from "next/server";

import { createAuthenticatedClientSdk } from "@/app/api/lib/backend-sdk-client";
import { getAuthToken } from "@/app/api/lib/sdk-client";

/**
 * Get authenticated SDK client for client routes
 * Uses session token from request headers
 */
async function getAuthenticatedClientSdk(request: NextRequest) {
  const authToken = getAuthToken(request.headers);
  
  if (!authToken) {
    throw new Error("Authorization required");
  }
  
  return await createAuthenticatedClientSdk(authToken);
}

/**
 * Create a GET client route handler
 * Calls the corresponding SDK method and returns the result
 */
export function createGetClientRoute(
  sdkMethod: (sdk: KrapiWrapper, ...args: unknown[]) => Promise<unknown>,
  extractParams?: (request: NextRequest) => Promise<unknown[]>
) {
  return async (request: NextRequest, _context?: { params?: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      const sdk = await getAuthenticatedClientSdk(request);
      const params = extractParams ? await extractParams(request) : [];
      const result = await sdkMethod(sdk, ...params);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Request failed";
      const statusCode = (error as { status?: number })?.status || 500;
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode }
      );
    }
  };
}

/**
 * Create a POST client route handler
 * Calls the corresponding SDK method with request body
 */
export function createPostClientRoute(
  sdkMethod: (sdk: KrapiWrapper, body: unknown, ...args: unknown[]) => Promise<unknown>,
  extractParams?: (request: NextRequest) => Promise<unknown[]>
) {
  return async (request: NextRequest, _context?: { params?: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      const body = await request.json();
      const sdk = await getAuthenticatedClientSdk(request);
      const params = extractParams ? await extractParams(request) : [];
      const result = await sdkMethod(sdk, body, ...params);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Request failed";
      const statusCode = (error as { status?: number })?.status || 500;
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode }
      );
    }
  };
}

/**
 * Create a PUT client route handler
 */
export function createPutClientRoute(
  sdkMethod: (sdk: KrapiWrapper, body: unknown, ...args: unknown[]) => Promise<unknown>,
  extractParams?: (request: NextRequest) => Promise<unknown[]>
) {
  return createPostClientRoute(sdkMethod, extractParams);
}

/**
 * Create a PATCH client route handler
 */
export function createPatchClientRoute(
  sdkMethod: (sdk: KrapiWrapper, body: unknown, ...args: unknown[]) => Promise<unknown>,
  extractParams?: (request: NextRequest) => Promise<unknown[]>
) {
  return createPostClientRoute(sdkMethod, extractParams);
}

/**
 * Create a DELETE client route handler
 */
export function createDeleteClientRoute(
  sdkMethod: (sdk: KrapiWrapper, ...args: unknown[]) => Promise<unknown>,
  extractParams?: (request: NextRequest) => Promise<unknown[]>
) {
  return async (request: NextRequest, _context?: { params?: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      const sdk = await getAuthenticatedClientSdk(request);
      const params = extractParams ? await extractParams(request) : [];
      const result = await sdkMethod(sdk, ...params);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Request failed";
      const statusCode = (error as { status?: number })?.status || 500;
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: statusCode }
      );
    }
  };
}

