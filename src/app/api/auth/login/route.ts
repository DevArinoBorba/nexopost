import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession, verifyPassword, getProfiles, createProfile } from '@/lib/db';

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

    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Esta conta está suspensa. Entre em contato com o administrador.' },
        { status: 403 }
      );
    }

    const userAgent = request.headers.get('user-agent') || null;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const session = createSession(user.id, { userAgent, ipAddress });
    const profiles = getProfiles(user.id);
    const defaultProfile = profiles[0] || createProfile(user.id, 'default');

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role || 'user',
        company: user.company || null,
        phone: user.phone || null,
      },
      profile: {
        id: defaultProfile.id,
        username: defaultProfile.username,
      },
    });

    response.cookies.set('session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(session.expires_at),
      path: '/',
    });

    response.cookies.set('active_profile', defaultProfile.id, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 31536000,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
