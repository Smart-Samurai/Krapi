import { NextRequest, NextResponse } from 'next/server';
import { createBackendClient, getAuthToken } from '@/app/api/lib/sdk-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authToken = getAuthToken(request.headers);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = createBackendClient(authToken);
    const response = await client.projects.getStats(id);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 404 });
    }
  } catch (error) {
    console.error('Get project stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}