import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  getActiveProfile,
  getAuthenticatedUser,
  getSessionIdFromCookies,
} from '@/lib/activeProfile';
import {
  getUserByEmail,
  updateUser,
  updateUserPassword,
  verifyPassword,
  updateProfile,
  getUserSessions,
  deleteSession,
  deleteUserSessions,
  getProfilesWithCounts,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sessionUser = getAuthenticatedUser();
  const user = sessionUser || getCurrentUser();
  const profile = getActiveProfile();
  const currentSessionId = getSessionIdFromCookies();
  const sessions = getUserSessions(user.id).map((s) => ({
    id: s.id,
    created_at: s.created_at || null,
    expires_at: s.expires_at,
    user_agent: s.user_agent || 'Navegador Web',
    ip_address: s.ip_address || 'Local',
    is_current: s.id === currentSessionId,
  }));

  return NextResponse.json({
    authenticated: Boolean(sessionUser),
    currentSessionId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role || 'user',
      status: user.status || 'active',
      company: user.company || null,
      phone: user.phone || null,
      avatar_url: user.avatar_url || null,
      last_login_at: user.last_login_at || null,
      created_at: user.created_at,
    },
    profile: {
      id: profile.id,
      username: profile.username,
    },
    profiles: getProfilesWithCounts(user.id),
    sessions,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const profile = getActiveProfile();
    const body = await request.json();

    // Alteração de senha
    if (body.action === 'change_password') {
      const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
          { status: 400 }
        );
      }

      // Valida senha atual se informada (ou se a senha atual não for a padrão 'changeme')
      const isDefaultPassword = verifyPassword('changeme', user.password_hash);
      if (!isDefaultPassword) {
        if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
          return NextResponse.json({ error: 'A senha atual informada está incorreta.' }, { status: 400 });
        }
      } else if (currentPassword && !verifyPassword(currentPassword, user.password_hash)) {
        return NextResponse.json({ error: 'A senha atual informada está incorreta.' }, { status: 400 });
      }

      updateUserPassword(user.id, newPassword);
      return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso.' });
    }

    // Atualização de dados da conta
    const { name, email, company, phone, avatar_url, profileName } = body as {
      name?: string;
      email?: string;
      company?: string;
      phone?: string;
      avatar_url?: string;
      profileName?: string;
    };

    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const other = getUserByEmail(email);
      if (other && other.id !== user.id) {
        return NextResponse.json({ error: 'Este email já está em uso por outra conta.' }, { status: 400 });
      }
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'O nome não pode ficar vazio.' }, { status: 400 });
    }

    const updatedUser = updateUser(user.id, {
      name: name !== undefined ? name.trim() : undefined,
      email: email !== undefined ? email.trim().toLowerCase() : undefined,
      company: company !== undefined ? company : undefined,
      phone: phone !== undefined ? phone : undefined,
      avatar_url: avatar_url !== undefined ? avatar_url : undefined,
    });

    let updatedProfile = profile;
    if (profileName && profileName.trim() && profileName.trim() !== profile.username) {
      updatedProfile = updateProfile(profile.id, profileName.trim()) || profile;
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            plan: updatedUser.plan,
            role: updatedUser.role || 'user',
            status: updatedUser.status || 'active',
            company: updatedUser.company || null,
            phone: updatedUser.phone || null,
            avatar_url: updatedUser.avatar_url || null,
            last_login_at: updatedUser.last_login_at || null,
            created_at: updatedUser.created_at,
          }
        : null,
      profile: {
        id: updatedProfile.id,
        username: updatedProfile.username,
      },
    });
  } catch (error) {
    console.error('[api/auth/me PATCH]', error);
    return NextResponse.json({ error: 'Falha ao atualizar os dados da conta.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = getCurrentUser();
  const currentSessionId = getSessionIdFromCookies();
  const sp = new URL(request.url).searchParams;
  const sessionId = sp.get('session_id');
  const otherSessions = sp.get('other_sessions');

  if (otherSessions === '1') {
    const removed = deleteUserSessions(user.id, currentSessionId || undefined);
    return NextResponse.json({ success: true, removed });
  }

  if (sessionId) {
    deleteSession(sessionId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 });
}
