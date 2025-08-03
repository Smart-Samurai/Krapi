import { NextRequest, NextResponse } from "next/server";
import { createBackendClient, getAuthToken } from "@/app/api/lib/sdk-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const client = createBackendClient(authToken);
    const response = await client.projects.getById(id);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 404 });
    }
  } catch (error) {
    console.error("Get project error:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const isAxiosError =
      error && typeof error === "object" && "response" in error;

    if (isAxiosError) {
      const axiosError = error as any;
      console.error("Axios error details:", {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? {
                message: errorMessage,
                isAxiosError: isAxiosError,
                timestamp: new Date().toISOString(),
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const client = createBackendClient(authToken);
    const response = await client.projects.update(id, body);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = createBackendClient(authToken);
    const response = await client.projects.delete(id);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
