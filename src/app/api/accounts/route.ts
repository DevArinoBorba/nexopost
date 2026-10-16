import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { getAccounts, deleteAccount, upsertAccount, updateAccountTokens, type Account } from '@/lib/db';
import { listProviders, getProvider } from '@/lib/platforms';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { GRAPH, igProfile } from '@/lib/platforms/meta';
import { fetchJson } from '@/lib/platforms/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function getTokenStatus(a: Account): 'valid' | 'expiring_soon' | 'expired' | 'permanent' {
  if (!a.token_expires_at) return 'permanent';
  const exp = new Date(a.token_expires_at).getTime();
  const diff = exp - Date.now();
  if (diff <= 0) return a.refresh_token ? 'valid' : 'expired';
  if (diff < 24 * 60 * 60 * 1000) return 'expiring_soon';
  return 'valid';
}

function publicAccount(a: Account) {
  return {
    id: a.id,
    platform: a.platform,
    external_id: a.external_id,
    display_name: a.display_name,
    handle: a.handle,
    avatar_url: a.avatar_url,
    connected_at: a.created_at,
    updated_at: a.updated_at,
    token_expires_at: a.token_expires_at,
    has_refresh_token: Boolean(a.refresh_token),
    token_status: getTokenStatus(a),
    meta: parseMeta(a.meta),
  };
}

export async function GET() {
  const profile = getActiveProfile();
  const accounts = getAccounts(profile.id).map(publicAccount);
  return NextResponse.json({
    profile: { id: profile.id, username: profile.username },
    accounts,
    providers: listProviders(),
  });
}

// POST /api/accounts — Verifica e sincroniza os dados reais da(s) conta(s) conectada(s)
export async function POST(request: NextRequest) {
  const profile = getActiveProfile();
  const body = await request.json().catch(() => ({}));
  const targetPlatform = body.platform ? String(body.platform) : null;

  const all = getAccounts(profile.id);
  const toSync = targetPlatform ? all.filter((a) => a.platform === targetPlatform) : all;

  if (toSync.length === 0) {
    return NextResponse.json({ error: 'Nenhuma conta conectada encontrada para sincronizar.' }, { status: 404 });
  }

  const results: { platform: string; ok: boolean; display_name?: string | null; followers?: number; error?: string }[] = [];

  for (const acc of toSync) {
    try {
      const provider = getProvider(acc.platform);
      if (!provider) {
        results.push({ platform: acc.platform, ok: false, error: 'Provedor não encontrado' });
        continue;
      }

      let accessToken = acc.access_token ? decryptSecret(acc.access_token) : '';
      const refreshToken = acc.refresh_token ? decryptSecret(acc.refresh_token) : '';
      const expiresAt = acc.token_expires_at ? new Date(acc.token_expires_at).getTime() : 0;

      // Se o token tem expiração vencida ou prestes a vencer e possui refresh_token, renova antes de consultar
      if (refreshToken && expiresAt > 0 && expiresAt - Date.now() < 5 * 60 * 1000) {
        const refreshed = await provider.refreshTokens(refreshToken);
        accessToken = refreshed.access_token;
        updateAccountTokens(acc.id, {
          access_token: encryptSecret(refreshed.access_token),
          refresh_token: refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : null,
          token_expires_at: refreshed.expires_at ?? null,
          scope: refreshed.scope ?? null,
        });
      }

      const currentMeta = parseMeta(acc.meta);

      if (acc.platform === 'instagram' && acc.external_id) {
        const prof = await igProfile(acc.external_id, accessToken);
        const nextMeta = {
          ...currentMeta,
          igUserId: acc.external_id,
          followers: prof.followers_count ?? currentMeta.followers ?? 0,
          verified_at: new Date().toISOString(),
        };
        upsertAccount({
          profile_id: acc.profile_id,
          platform: 'instagram',
          external_id: acc.external_id,
          display_name: prof.name || prof.username || acc.display_name,
          handle: prof.username ? `@${prof.username}` : acc.handle,
          avatar_url: prof.profile_picture_url || acc.avatar_url,
          access_token: acc.access_token,
          refresh_token: acc.refresh_token,
          token_expires_at: acc.token_expires_at,
          scope: acc.scope,
          meta: JSON.stringify(nextMeta),
        });
        results.push({
          platform: 'instagram',
          ok: true,
          display_name: prof.name || prof.username || acc.display_name,
          followers: Number(nextMeta.followers || 0),
        });
      } else if (acc.platform === 'facebook' && acc.external_id) {
        const pageData = await fetchJson<{
          id: string;
          name?: string;
          followers_count?: number;
          fan_count?: number;
          picture?: { data?: { url?: string } };
        }>(
          `${GRAPH}/${acc.external_id}?${new URLSearchParams({
            fields: 'id,name,followers_count,fan_count,picture{url}',
            access_token: accessToken,
          })}`
        );
        const followers = pageData.followers_count ?? pageData.fan_count ?? Number(currentMeta.followers || 0);
        const nextMeta = {
          ...currentMeta,
          pageId: acc.external_id,
          pageName: pageData.name || acc.display_name,
          followers,
          verified_at: new Date().toISOString(),
        };
        upsertAccount({
          profile_id: acc.profile_id,
          platform: 'facebook',
          external_id: acc.external_id,
          display_name: pageData.name || acc.display_name,
          handle: pageData.name || acc.handle,
          avatar_url: pageData.picture?.data?.url || acc.avatar_url,
          access_token: acc.access_token,
          refresh_token: acc.refresh_token,
          token_expires_at: acc.token_expires_at,
          scope: acc.scope,
          meta: JSON.stringify(nextMeta),
        });
        results.push({
          platform: 'facebook',
          ok: true,
          display_name: pageData.name || acc.display_name,
          followers,
        });
      } else {
        // YouTube ou TikTok
        const info = await provider.getAccountInfo({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
        });
        const nextMeta = {
          ...currentMeta,
          ...(info.meta || {}),
          verified_at: new Date().toISOString(),
        };
        const updatedAcc = getAccounts(profile.id).find((x) => x.id === acc.id) || acc;
        upsertAccount({
          profile_id: acc.profile_id,
          platform: acc.platform,
          external_id: info.external_id || acc.external_id,
          display_name: info.display_name || acc.display_name,
          handle: info.handle || acc.handle,
          avatar_url: info.avatar_url || acc.avatar_url,
          access_token: updatedAcc.access_token,
          refresh_token: updatedAcc.refresh_token,
          token_expires_at: updatedAcc.token_expires_at,
          scope: updatedAcc.scope,
          meta: JSON.stringify(nextMeta),
        });
        results.push({
          platform: acc.platform,
          ok: true,
          display_name: info.display_name || acc.display_name,
          followers: Number((nextMeta as Record<string, unknown>).followers || 0),
        });
      }
    } catch (e) {
      results.push({
        platform: acc.platform,
        ok: false,
        error: (e as Error).message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    accounts: getAccounts(profile.id).map(publicAccount),
  });
}

export async function DELETE(request: NextRequest) {
  const profile = getActiveProfile();
  const platform = new URL(request.url).searchParams.get('platform');
  if (!platform) {
    return NextResponse.json({ error: 'Parâmetro "platform" é obrigatório' }, { status: 400 });
  }
  const removed = deleteAccount(profile.id, platform);
  return NextResponse.json({ success: removed > 0, removed });
}
