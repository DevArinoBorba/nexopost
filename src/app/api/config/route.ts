import { NextResponse } from 'next/server';
import { getActiveProfile, getCurrentUser, getAuthenticatedUser } from '@/lib/activeProfile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Informações do usuário/perfil ativo no servidor próprio.
export async function GET() {
  const sessionUser = getAuthenticatedUser();
  const user = sessionUser || getCurrentUser();
  const profile = getActiveProfile();
  return NextResponse.json({
    authenticated: Boolean(sessionUser),
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
    profile: { id: profile.id, username: profile.username },
    selfHosted: true,
  });
}
