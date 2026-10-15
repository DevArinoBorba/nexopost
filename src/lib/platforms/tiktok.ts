import fs from 'fs';
import type { SocialProvider, TokenSet, AccountInfo, PublishInput, PublishResult } from './types';
import { ProviderError, fetchJson } from './types';

// ============================================================
// TikTok — Content Posting API (Login Kit + Direct Post + Rascunho)
// ============================================================

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const API = 'https://open.tiktokapis.com/v2';

// video.publish = publicar direto | video.upload = enviar rascunho (caixa de entrada)
const SCOPES = ['user.info.basic', 'video.publish', 'video.upload'];

const MIN_CHUNK = 5 * 1024 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;

function creds() {
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  };
}

function redirectUri(): string {
  return process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3000/api/oauth/tiktok/callback';
}

interface TikTokError {
  code?: string;
  message?: string;
  log_id?: string;
}

function checkError(error?: TikTokError) {
  if (error && error.code && error.code !== 'ok') {
    const known: Record<string, string> = {
      unaudited_client_can_only_post_to_private_accounts:
        'App ainda não auditado pelo TikTok: só é possível publicar como PRIVADO (SELF_ONLY). ' +
        'Use a visibilidade "Privado" ou o modo "Rascunho".',
      scope_not_authorized: 'O token não tem permissão de publicação (video.publish). Reconecte a conta.',
      access_token_invalid: 'Token do TikTok expirado ou inválido. Reconecte a conta.',
      privacy_level_option_mismatch:
        'Nível de privacidade inválido para esta conta. Escolha uma das opções permitidas pelo TikTok.',
      rate_limit_exceeded: 'Limite de requisições do TikTok atingido (6/min). Tente novamente.',
      spam_risk_too_many_posts: 'Limite diário de posts via API atingido para esta conta.',
    };
    throw new ProviderError(known[error.code] || `TikTok: ${error.message || error.code}`, 400, error);
  }
}

export const tiktokProvider: SocialProvider = {
  id: 'tiktok',
  name: 'TikTok',
  supports: ['video', 'photo'],
  usesPkce: true,

  isConfigured() {
    const c = creds();
    return Boolean(c.clientKey && c.clientSecret);
  },

  getAuthUrl({ state, codeChallenge }) {
    const c = creds();
    const params = new URLSearchParams({
      client_key: c.clientKey,
      response_type: 'code',
      scope: SCOPES.join(','),
      redirect_uri: redirectUri(),
      state,
    });
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode({ code, codeVerifier }) {
    const c = creds();
    const body = new URLSearchParams({
      client_key: c.clientKey,
      client_secret: c.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
    });
    if (codeVerifier) body.set('code_verifier', codeVerifier);

    const data = await fetchJson<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      refresh_expires_in: number;
      open_id: string;
      scope: string;
      error?: string;
      error_description?: string;
    }>(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (data.error) throw new ProviderError(`TikTok: ${data.error_description || data.error}`, 400, data);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      scope: data.scope,
    };
  },

  async refreshTokens(refreshToken) {
    const c = creds();
    const data = await fetchJson<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope?: string;
      error?: string;
    }>(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: c.clientKey,
        client_secret: c.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (data.error) throw new ProviderError(`TikTok refresh: ${data.error}`, 400, data);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      scope: data.scope,
    };
  },

  async getAccountInfo(tokens): Promise<AccountInfo> {
    const data = await fetchJson<{
      data?: {
        user?: {
          open_id: string;
          union_id?: string;
          avatar_url?: string;
          display_name?: string;
          username?: string;
        };
      };
      error?: TikTokError;
    }>(`${API}/user/info/?fields=open_id,union_id,avatar_url,display_name,username`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    checkError(data.error);

    const user = data.data?.user;
    if (!user) throw new ProviderError('Não foi possível obter os dados do usuário do TikTok.', 400, data);

    return {
      external_id: user.open_id,
      display_name: user.display_name || 'TikTok',
      handle: user.username ? `@${user.username}` : undefined,
      avatar_url: user.avatar_url,
      meta: { openId: user.open_id, unionId: user.union_id },
    };
  },

  async publish({ tokens, input }): Promise<PublishResult> {
    if (input.mediaType !== 'video') {
      throw new ProviderError('Por enquanto o TikTok está implementado para vídeos.', 400);
    }
    if (!input.filePath || !fs.existsSync(input.filePath)) {
      throw new ProviderError('Arquivo de vídeo não encontrado.', 400);
    }

    const token = tokens.access_token;
    const size = fs.statSync(input.filePath).size;
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' };

    // Modo rascunho: envia para a caixa de entrada do usuário (não exige auditoria)
    const mode = (input.extra?.mode as string) || 'direct';
    if (mode === 'draft') {
      return uploadVideo({
        endpoint: `${API}/post/publish/inbox/video/init/`,
        auth,
        filePath: input.filePath,
        size,
        body: {
          source_info: sourceInfo(size),
        },
        mimeType: input.mimeType,
      });
    }

    // Modo direto: consulta as opções de privacidade permitidas
    const creator = await fetchJson<{
      data?: {
        privacy_level_options?: string[];
        comment_disabled?: boolean;
        duet_disabled?: boolean;
        stitch_disabled?: boolean;
        max_video_post_duration_sec?: number;
        creator_username?: string;
      };
      error?: TikTokError;
    }>(`${API}/post/publish/creator_info/query/`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({}),
    });
    checkError(creator.error);

    const options = creator.data?.privacy_level_options || [];
    if (options.length === 0) {
      throw new ProviderError('O TikTok não retornou níveis de privacidade para esta conta.', 400, creator);
    }

    const mapping: Record<string, string> = {
      public: 'PUBLIC_TO_EVERYONE',
      unlisted: 'SELF_ONLY',
      private: 'SELF_ONLY',
      followers: 'FOLLOWER_OF_CREATOR',
      friends: 'MUTUAL_FOLLOW_FRIENDS',
    };
    let privacy = mapping[input.privacy || 'public'] || 'PUBLIC_TO_EVERYONE';
    let note: string | undefined;

    if (!options.includes(privacy)) {
      // App não auditado normalmente só permite SELF_ONLY
      if (options.includes('SELF_ONLY')) {
        note = `TikTok permitiu apenas SELF_ONLY (app não auditado). Publicado como privado.`;
        privacy = 'SELF_ONLY';
      } else {
        privacy = options[0];
        note = `Privacidade ajustada para ${privacy} (permitido pela conta).`;
      }
    }

    const title = (input.description || input.title || '').slice(0, 2200);

    const result = await uploadVideo({
      endpoint: `${API}/post/publish/video/init/`,
      auth,
      filePath: input.filePath,
      size,
      mimeType: input.mimeType,
      body: {
        post_info: {
          title,
          privacy_level: privacy,
          disable_duet: Boolean(input.extra?.disable_duet),
          disable_comment: Boolean(input.extra?.disable_comment),
          disable_stitch: Boolean(input.extra?.disable_stitch),
          video_cover_timestamp_ms: Number(input.extra?.cover_timestamp_ms || 1000),
        },
        source_info: sourceInfo(size),
      },
      note,
    });

    return result;
  },
};

function sourceInfo(size: number) {
  if (size <= MAX_CHUNK) {
    return { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 };
  }
  const chunk = 10 * 1024 * 1024; // 10MB, dentro de [5MB, 64MB]
  const total = Math.ceil(size / chunk);
  return { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunk, total_chunk_count: total };
}

async function uploadVideo(opts: {
  endpoint: string;
  auth: Record<string, string>;
  filePath: string;
  size: number;
  body: unknown;
  mimeType?: string;
  note?: string;
}): Promise<PublishResult> {
  const init = await fetchJson<{
    data?: { publish_id?: string; upload_url?: string };
    error?: TikTokError;
  }>(opts.endpoint, {
    method: 'POST',
    headers: opts.auth,
    body: JSON.stringify(opts.body),
  });
  checkError(init.error);

  const publishId = init.data?.publish_id;
  const uploadUrl = init.data?.upload_url;
  if (!publishId || !uploadUrl) {
    throw new ProviderError('TikTok não retornou publish_id/upload_url.', 502, init);
  }

  // Envia o arquivo (em blocos, se necessário)
  const chunkSize = opts.size <= MAX_CHUNK ? opts.size : 10 * 1024 * 1024;
  const fd = fs.openSync(opts.filePath, 'r');
  try {
    let offset = 0;
    while (offset < opts.size) {
      const len = Math.min(chunkSize, opts.size - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': opts.mimeType || 'video/mp4',
          'Content-Length': String(len),
          'Content-Range': `bytes ${offset}-${offset + len - 1}/${opts.size}`,
        },
        body: new Uint8Array(buf),
      });

      if (!res.ok && res.status !== 206) {
        const text = await res.text();
        throw new ProviderError(`Falha ao enviar o vídeo ao TikTok: HTTP ${res.status} ${text.slice(0, 200)}`, res.status);
      }
      offset += len;
    }
  } finally {
    fs.closeSync(fd);
  }

  // Acompanha o status até concluir
  const status = await pollStatus(publishId, opts.auth.Authorization);

  return {
    external_post_id: publishId,
    post_url: status.publicUrl,
    raw: { publish_id: publishId, status, note: opts.note },
  };
}

async function pollStatus(
  publishId: string,
  authorization: string,
  timeoutMs = 120_000
): Promise<{ status: string; publicUrl?: string; failReason?: string }> {
  const started = Date.now();
  let delay = 2000;
  while (Date.now() - started < timeoutMs) {
    const data = await fetchJson<{
      data?: {
        status?: string;
        fail_reason?: string;
        publicaly_available_post_id?: string[] | string;
      };
      error?: TikTokError;
    }>(`${API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ publish_id: publishId }),
    });
    checkError(data.error);

    const st = data.data?.status || '';
    if (st === 'PUBLISH_COMPLETE' || st === 'SEND_TO_USER_INBOX') {
      const ids = data.data?.publicaly_available_post_id;
      const id = Array.isArray(ids) ? ids[0] : ids;
      return {
        status: st,
        publicUrl: id ? `https://www.tiktok.com/@me/video/${id}` : undefined,
      };
    }
    if (st === 'FAILED') {
      throw new ProviderError(`TikTok recusou o vídeo: ${data.data?.fail_reason || 'motivo desconhecido'}`, 400, data);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 8000);
  }
  // Não falha: o vídeo pode concluir depois
  return { status: 'PROCESSING' };
}
