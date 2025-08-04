import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSdk, getAuthToken } from '@/app/api/lib/sdk-client';

export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request.headers);
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const client = createAuthenticatedSdk(authToken);
    const response = await client.auth.logout();

    return NextResponse.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}