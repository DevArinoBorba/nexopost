import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession, verifyPassword } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ success: false, error: 'Credenciais inválidas' }, { status: 401 });
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
