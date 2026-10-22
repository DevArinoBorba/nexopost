import { ProviderError, fetchJson, expiresAt } from './types';
import type { TokenSet } from './types';

// ============================================================
// Helpers compartilhados da Meta (Facebook + Instagram)
// ============================================================

export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
// Upload de vídeo do Facebook usa um host separado
export const GRAPH_VIDEO = `https://graph-video.facebook.com/${GRAPH_VERSION}`;
export const DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export function metaCreds() {
  return {
    clientId: process.env.META_CLIENT_ID || '',
    clientSecret: process.env.META_CLIENT_SECRET || '',
  };
}

export function redirectUri(platform: string): string {
  const envKey = `${platform.toUpperCase()}_REDIRECT_URI`;
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  return process.env[envKey] || (appUrl ? `${appUrl}/api/oauth/${platform}/callback` : `http://localhost:3000/api/oauth/${platform}/callback`);
}

export function isConfigured(): boolean {
  const c = metaCreds();
  return Boolean(c.clientId && c.clientSecret);
}

export function buildAuthUrl(opts: { platform: string; scopes: string[]; state: string }): string {
  const c = metaCreds();
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: redirectUri(opts.platform),
    state: opts.state,
    response_type: 'code',
    scope: opts.scopes.join(','),
    // Garante que a tela de permissões reapareça (necessário quando adicionamos escopos)
    auth_type: 'rerequest',
  });
  return `${DIALOG}?${params.toString()}`;
}

/** Troca o code por um token de curta duração e depois por um de longa duração (60 dias). */
export async function exchangeForLongLived(opts: { platform: string; code: string }): Promise<TokenSet> {
  const c = metaCreds();
  const short = await fetchJson<{ access_token: string; expires_in?: number }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: redirectUri(opts.platform),
      code: opts.code,
    })}`
  );

  // fb_exchange_token → token de longa duração
  const long = await fetchJson<{ access_token: string; expires_in?: number }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: c.clientId,
      client_secret: c.clientSecret,
      fb_exchange_token: short.access_token,
    })}`
  );

  return {
    access_token: long.access_token,
    expires_at: long.expires_in ? expiresAt(long.expires_in) : undefined,
  };
}

export interface FbPage {
  id: string;
  name: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
}

/** Lista as Páginas do Facebook do usuário (com o page token de cada uma). */
export async function listPages(userToken: string): Promise<FbPage[]> {
  const data = await fetchJson<{ data?: FbPage[] }>(
    `${GRAPH}/me/accounts?${new URLSearchParams({
      fields: 'id,name,access_token,picture{url}',
      access_token: userToken,
    })}`
  );
  return data.data || [];
}

/** Descobre a conta do Instagram Business vinculada a uma Página. */
export async function instagramBusinessAccount(pageId: string, pageToken: string): Promise<string | null> {
  try {
    const data = await fetchJson<{
      instagram_business_account?: { id: string };
      connected_instagram_account?: { id: string };
    }>(
      `${GRAPH}/${pageId}?${new URLSearchParams({
        fields: 'instagram_business_account,connected_instagram_account',
        access_token: pageToken,
      })}`
    );
    return data.instagram_business_account?.id || data.connected_instagram_account?.id || null;
  } catch {
    return null;
  }
}

export interface IgProfile {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export async function igProfile(igUserId: string, token: string): Promise<IgProfile> {
  return fetchJson<IgProfile>(
    `${GRAPH}/${igUserId}?${new URLSearchParams({
      fields: 'id,username,name,profile_picture_url,followers_count',
      access_token: token,
    })}`
  );
}

export function assertPageToken(token: string) {
  if (!token) throw new ProviderError('Token da Página ausente. Reconecte a conta do Facebook.', 401);
}
