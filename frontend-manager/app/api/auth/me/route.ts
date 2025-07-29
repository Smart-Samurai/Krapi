import { NextRequest, NextResponse } from 'next/server';
import { createBackendClient, getAuthToken } from '@/app/api/lib/sdk-client';

export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const client = createBackendClient(authToken);
    const response = await client.auth.getCurrentUser();

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 401 });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}