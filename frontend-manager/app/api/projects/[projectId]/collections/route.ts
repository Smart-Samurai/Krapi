import { NextRequest, NextResponse } from "next/server";

import { krapi } from "@/lib/krapi";

/**
 * Get all collections in a project
 * GET /api/projects/[projectId]/collections
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const options = {
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : undefined,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : undefined,
      search: searchParams.get("search") || undefined,
    };

    const { projectId } = await params;
    const collections = await krapi.collections.getAll(projectId, options);
    return NextResponse.json(collections);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get collections",
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new collection
 * POST /api/projects/[projectId]/collections
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const collectionData = await request.json();

    if (!collectionData.name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    if (!collectionData.fields || !Array.isArray(collectionData.fields)) {
      return NextResponse.json(
        { error: "Collection fields are required and must be an array" },
        { status: 400 }
      );
    }

    const { projectId } = await params;
    const collection = await krapi.collections.create(
      projectId,
      collectionData
    );
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create collection",
      },
      { status: 500 }
    );
  }
}
