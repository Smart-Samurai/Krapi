import { NextRequest, NextResponse } from 'next/server';
import { createBackendClient, getAuthToken } from '@/app/api/lib/sdk-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; tableName: string } }
) {
  try {
    const authToken = getAuthToken(request.headers);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const options = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      sort: searchParams.get('sort') || undefined,
      order: (searchParams.get('order') as 'asc' | 'desc') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const client = createBackendClient(authToken);
    const response = await client.database.getDocuments(
      params.projectId, 
      params.tableName,
      options
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; tableName: string } }
) {
  try {
    const authToken = getAuthToken(request.headers);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const client = createBackendClient(authToken);
    const response = await client.database.createDocument(
      params.projectId,
      params.tableName,
      body.data
    );

    if (response.success) {
      return NextResponse.json(response, { status: 201 });
    } else {
      return NextResponse.json(response, { status: 400 });
    }
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}