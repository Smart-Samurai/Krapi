import { NextRequest, NextResponse } from "next/server";

/**
 * Frontend Health Check
 * GET /api/health
 *
 * This route checks the health of the frontend and its connection to the backend
 */
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    // Check if we can connect to the backend via direct HTTP call
    let backendHealth = null;
    let backendConnected = false;

    try {
      // Try to get a simple response from backend directly
      const response = await fetch("http://localhost:3470/health");
      if (response.ok) {
        backendHealth = await response.json();
        backendConnected = true;
      } else {
        backendConnected = false;
      }
    } catch (error: unknown) {
      backendConnected = false;
      
    }

    const frontendHealth = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      frontend: {
        status: "running",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      },
      backend: {
        connected: backendConnected,
        health: backendHealth,
      },
    };

    return NextResponse.json(frontendHealth);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
