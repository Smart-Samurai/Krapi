import { NextRequest, NextResponse } from 'next/server';
import { createBackendClient } from '@/app/api/lib/sdk-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = createBackendClient();
    const response = await client.auth.adminLogin(email, password);

    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(response, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}