import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session')?.value;
  if (sessionId) {
    try {
      deleteSession(sessionId);
    } catch {
      // ignora falha se já removida
    }
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  response.cookies.set('active_profile', '', {
    httpOnly: false,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
