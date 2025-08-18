import { NextRequest, NextResponse } from "next/server";
import { krapi } from "@krapi/sdk";

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

    const projects = await krapi.projects.getAll(options);
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
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
    const projectData = await request.json();

    if (!projectData.name) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    const project = await krapi.projects.create(projectData);
    return NextResponse.json({ success: true, data: project }, { status: 201 });
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
