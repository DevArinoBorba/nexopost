import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, createSession, getProfiles } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, company, phone, initialProfileName } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }
    if (getUserByEmail(email)) {
      return NextResponse.json({ success: false, error: 'Este email já está cadastrado' }, { status: 400 });
    }

    const user = createUser({
      email,
      password,
      name,
      company: company || null,
      phone: phone || null,
      initialProfileName: initialProfileName || company || 'Principal',
    });

    const userAgent = request.headers.get('user-agent') || null;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const session = createSession(user.id, { userAgent, ipAddress });
    const profiles = getProfiles(user.id);
    const defaultProfile = profiles[0];

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
      profile: defaultProfile ? { id: defaultProfile.id, username: defaultProfile.username } : null,
    });

    response.cookies.set('session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(session.expires_at),
      path: '/',
    });

    if (defaultProfile) {
      response.cookies.set('active_profile', defaultProfile.id, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 31536000,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
