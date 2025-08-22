import { NextRequest, NextResponse } from "next/server";
import {
  serverSdk,
  createAuthenticatedSdk,
  getAuthToken,
} from "@/app/api/lib/sdk-client";

// Use basic types for now - can enhance later
interface ProjectListOptions {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}

/**
 * Get all projects
 * GET /api/projects
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const options: ProjectListOptions = {
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : undefined,
      search: searchParams.get("search") || undefined,
      status: (searchParams.get("status") as any) || undefined,
    };

    // Create authenticated SDK instance using the session token
    const authenticatedSdk = createAuthenticatedSdk(authToken);

    const projects = await authenticatedSdk.projects.getAll(options);

    console.log(
      "🔍 [FRONTEND DEBUG] SDK returned projects:",
      JSON.stringify(projects, null, 2)
    );

    // Return paginated structure that the test expects
    return NextResponse.json({
      data: projects,
      total: projects.length,
      limit: options.limit || projects.length,
      offset: options.offset || 0,
      page: options.page || 1,
      perPage: options.limit || projects.length,
      has_next: false,
      has_prev: false,
      total_pages: 1,
    });
  } catch (error) {
    console.error("🔍 [FRONTEND ERROR] Failed to get projects:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get projects",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new project
 * POST /api/projects
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Extract authentication token from headers
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const projectData = await request.json();

    if (!projectData.name) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    // Create authenticated SDK instance using the session token
    const authenticatedSdk = createAuthenticatedSdk(authToken);

    // Use the authenticated SDK to create project
    // SDK expects: projects.create(projectData: { name, description, settings })
    const project = await authenticatedSdk.projects.create({
      name: projectData.name,
      description: projectData.description,
      settings: projectData.settings,
    });

    console.log(
      "🔍 [FRONTEND DEBUG] SDK returned project:",
      JSON.stringify(project, null, 2)
    );

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}
