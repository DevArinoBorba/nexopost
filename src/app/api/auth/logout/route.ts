import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear session cookie
  response.cookies.set('session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
