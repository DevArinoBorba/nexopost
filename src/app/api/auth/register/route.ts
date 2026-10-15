import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, createSession } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }
    if (getUserByEmail(email)) {
      return NextResponse.json({ success: false, error: 'Email já cadastrado' }, { status: 400 });
    }

    const user = createUser({ email, password, name });
    const session = createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    });

    response.cookies.set('session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(session.expires_at),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
