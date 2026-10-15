import { NextResponse } from 'next/server';
import { getActiveProfile, getCurrentUser } from '@/lib/activeProfile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Informações do usuário/perfil ativo no servidor próprio.
export async function GET() {
  const user = getCurrentUser();
  const profile = getActiveProfile();
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    profile: { id: profile.id, username: profile.username },
    selfHosted: true,
  });
}
