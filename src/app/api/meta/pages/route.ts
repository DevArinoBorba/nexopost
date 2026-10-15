import { NextRequest, NextResponse } from 'next/server';
import { decryptSecret } from '@/lib/crypto';
import { getMetaSession, getProfileById, getAccounts, deleteAccount } from '@/lib/db';
import { listPages, instagramBusinessAccount, igProfile } from '@/lib/platforms/meta';
import { getCurrentUser } from '@/lib/activeProfile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lista todas as Páginas do Facebook que o usuário administra
// (para uma agência, isso inclui as Páginas dos clientes).
export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get('session');
  if (!sessionId) return NextResponse.json({ error: 'Parâmetro "session" obrigatório' }, { status: 400 });

  const encrypted = getMetaSession(sessionId);
  if (!encrypted) return NextResponse.json({ error: 'Sessão expirada. Conecte novamente.' }, { status: 400 });

  const userToken = decryptSecret(encrypted);

  try {
    const pages = await listPages(userToken);
    const result = [];

    for (const page of pages) {
      let instagram: { id: string; username?: string; avatar?: string } | null = null;
      if (page.access_token) {
        const igId = await instagramBusinessAccount(page.id, page.access_token);
        if (igId) {
          try {
            const prof = await igProfile(igId, page.access_token);
            instagram = { id: igId, username: prof.username, avatar: prof.profile_picture_url };
          } catch {
            instagram = { id: igId };
          }
        }
      }
      result.push({
        id: page.id,
        name: page.name,
        avatar: page.picture?.data?.url,
        instagram,
      });
    }

    return NextResponse.json({ pages: result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// Remove contas (usado para "mover" uma Página entre clientes)
export async function DELETE(request: NextRequest) {
  const user = getCurrentUser();
  const sp = new URL(request.url).searchParams;
  const profileId = sp.get('profile_id');
  const platform = sp.get('platform');
  if (!profileId || !platform) {
    return NextResponse.json({ error: 'profile_id e platform são obrigatórios' }, { status: 400 });
  }
  const profile = getProfileById(profileId);
  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  const removed = deleteAccount(profileId, platform);
  return NextResponse.json({ success: removed > 0, accounts: getAccounts(profileId).map((a) => a.platform) });
}
