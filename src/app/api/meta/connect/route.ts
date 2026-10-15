import { NextRequest, NextResponse } from 'next/server';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { getMetaSession, getProfileById, upsertAccount, getAccounts } from '@/lib/db';
import { listPages, instagramBusinessAccount, igProfile } from '@/lib/platforms/meta';
import { getCurrentUser } from '@/lib/activeProfile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Conecta uma Página (e o Instagram dela, se houver) a um cliente (perfil).
 * Body: { session, pageId, profileId, platforms?: ['facebook','instagram'] }
 */
export async function POST(request: NextRequest) {
  const user = getCurrentUser();
  const body = await request.json().catch(() => ({}));
  const { session, pageId, profileId } = body as { session?: string; pageId?: string; profileId?: string };
  const wants: string[] = Array.isArray(body.platforms) ? body.platforms : ['facebook', 'instagram'];

  if (!session || !pageId || !profileId) {
    return NextResponse.json({ error: 'session, pageId e profileId são obrigatórios' }, { status: 400 });
  }

  const profile = getProfileById(profileId);
  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  const encrypted = getMetaSession(session);
  if (!encrypted) return NextResponse.json({ error: 'Sessão expirada. Conecte novamente.' }, { status: 400 });
  const userToken = decryptSecret(encrypted);

  try {
    const pages = await listPages(userToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page || !page.access_token) {
      return NextResponse.json({ error: 'Página não encontrada ou sem permissão.' }, { status: 404 });
    }

    const connected: string[] = [];

    // Facebook
    if (wants.includes('facebook')) {
      upsertAccount({
        profile_id: profile.id,
        platform: 'facebook',
        external_id: page.id,
        display_name: page.name,
        handle: page.name,
        avatar_url: page.picture?.data?.url || null,
        access_token: encryptSecret(page.access_token),
        refresh_token: null,
        token_expires_at: null,
        scope: null,
        meta: JSON.stringify({ pageId: page.id, pageName: page.name }),
      });
      connected.push('facebook');
    }

    // Instagram (se a Página tiver conta Business vinculada)
    if (wants.includes('instagram')) {
      const igId = await instagramBusinessAccount(page.id, page.access_token);
      if (igId) {
        const prof = await igProfile(igId, page.access_token);
        upsertAccount({
          profile_id: profile.id,
          platform: 'instagram',
          external_id: igId,
          display_name: prof.name || prof.username || 'Instagram',
          handle: prof.username ? `@${prof.username}` : null,
          avatar_url: prof.profile_picture_url || null,
          access_token: encryptSecret(page.access_token),
          refresh_token: null,
          token_expires_at: null,
          scope: null,
          meta: JSON.stringify({ igUserId: igId, pageId: page.id, followers: prof.followers_count }),
        });
        connected.push('instagram');
      }
    }

    return NextResponse.json({
      success: true,
      connected,
      profile: { id: profile.id, username: profile.username },
      accounts: getAccounts(profile.id).map((a) => a.platform),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
