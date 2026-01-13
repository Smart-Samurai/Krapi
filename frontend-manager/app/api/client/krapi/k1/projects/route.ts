import { NextRequest } from "next/server";

/**
 * CLIENT ROUTE: Projects
 * 
 * GET /api/client/krapi/k1/projects - Get all projects
 * POST /api/client/krapi/k1/projects - Create a new project
 * 
 * ARCHITECTURE: Client route that uses SDK to call proxy route
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetProjectsClient(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateProjectClient(request);
}

async function handleGetProjectsClient(request: NextRequest): Promise<Response> {
  const { createAuthenticatedClientSdk } = await import("@/app/api/lib/backend-sdk-client");
  const { getAuthToken } = await import("@/app/api/lib/sdk-client");
  const { NextResponse } = await import("next/server");

  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const projects = await clientSdk.projects.getAll();

    const projectsArray = Array.isArray(projects) ? projects : [];
    return NextResponse.json({
      success: true,
      data: projectsArray,
      projects: projectsArray, // Also include for backward compatibility
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get projects",
      },
      { status: 500 }
    );
  }
}

async function handleCreateProjectClient(request: NextRequest): Promise<Response> {
  const { createAuthenticatedClientSdk } = await import("@/app/api/lib/backend-sdk-client");
  const { getAuthToken } = await import("@/app/api/lib/sdk-client");
  const { NextResponse } = await import("next/server");

  try {
    const authToken = getAuthToken(request.headers);

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    const clientSdk = await createAuthenticatedClientSdk(authToken);
    const project = await clientSdk.projects.create({
      name: body.name.trim(),
      description: body.description?.trim(),
      settings: body.settings,
    });

    return NextResponse.json({
      success: true,
      data: project,
      project, // Also include for backward compatibility
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create project",
      },
      { status: 500 }
    );
  }
}

