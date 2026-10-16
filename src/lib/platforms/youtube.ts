import fs from 'fs';
import type {
  SocialProvider,
  TokenSet,
  AccountInfo,
  PublishInput,
  PublishResult,
} from './types';
import { ProviderError, fetchJson, expiresAt } from './types';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

function creds() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/youtube/callback',
  };
}

export const youtubeProvider: SocialProvider = {
  id: 'youtube',
  name: 'YouTube',
  supports: ['video'],

  isConfigured() {
    const c = creds();
    return Boolean(c.clientId && c.clientSecret);
  },

  getAuthUrl({ state }) {
    const c = creds();
    const params = new URLSearchParams({
      client_id: c.clientId,
      redirect_uri: c.redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode({ code }) {
    const c = creds();
    const body = new URLSearchParams({
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: c.redirectUri,
      grant_type: 'authorization_code',
    });
    const data = await fetchJson<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    }>(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt(data.expires_in),
      scope: data.scope,
    };
  },

  async refreshTokens(refreshToken) {
    const c = creds();
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'refresh_token',
    });
    const data = await fetchJson<{ access_token: string; expires_in: number; scope?: string }>(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return {
      access_token: data.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt(data.expires_in),
      scope: data.scope,
    };
  },

  async getAccountInfo(tokens) {
    const data = await fetchJson<{
      items?: {
        id: string;
        snippet?: {
          title?: string;
          customUrl?: string;
          thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
        };
        statistics?: {
          subscriberCount?: string;
          viewCount?: string;
          videoCount?: string;
        };
      }[];
    }>(`${CHANNELS_URL}?part=snippet,statistics&mine=true`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const ch = data.items?.[0];
    if (!ch) throw new ProviderError('Nenhum canal do YouTube encontrado nesta conta Google.', 400, data);

    return {
      external_id: ch.id,
      display_name: ch.snippet?.title || 'YouTube Channel',
      handle: ch.snippet?.customUrl || undefined,
      avatar_url: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url,
      meta: {
        channelId: ch.id,
        followers: Number(ch.statistics?.subscriberCount || 0),
        views: Number(ch.statistics?.viewCount || 0),
        videos: Number(ch.statistics?.videoCount || 0),
      },
    };
  },

  async publish({ tokens, input }): Promise<PublishResult> {
    if (input.mediaType !== 'video') {
      throw new ProviderError('O YouTube só aceita vídeos.', 400);
    }
    if (!input.filePath || !fs.existsSync(input.filePath)) {
      throw new ProviderError('Arquivo de vídeo não encontrado.', 400);
    }

    const stat = fs.statSync(input.filePath);
    const privacy = input.privacy || (input.extra?.privacyStatus as string) || 'public';

    const metadata = {
      snippet: {
        title: (input.title || 'Sem título').slice(0, 100),
        description: (input.description || '').slice(0, 5000),
        categoryId: (input.extra?.categoryId as string) || '22',
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    };

    // 1) Inicia upload resumível -> recebe a URL de upload (Location)
    const initRes = await fetch(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': input.mimeType || 'video/*',
        'X-Upload-Content-Length': String(stat.size),
      },
      body: JSON.stringify(metadata),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      throw new ProviderError(`Falha ao iniciar upload no YouTube: ${err.slice(0, 300)}`, initRes.status, err);
    }

    const location = initRes.headers.get('location');
    if (!location) throw new ProviderError('YouTube não retornou URL de upload.', 502);

    // 2) Envia os bytes do vídeo
    const stream = fs.createReadStream(input.filePath);
    const upRes = await fetch(location, {
      method: 'PUT',
      headers: {
        'Content-Type': input.mimeType || 'video/*',
        'Content-Length': String(stat.size),
      },
      // @ts-expect-error stream body requer duplex no Node
      duplex: 'half',
      body: stream as unknown as BodyInit,
    });

    const upText = await upRes.text();
    if (!upRes.ok) {
      throw new ProviderError(`Falha no upload para o YouTube: ${upText.slice(0, 300)}`, upRes.status, upText);
    }

    const video = JSON.parse(upText) as { id: string };
    return {
      external_post_id: video.id,
      post_url: `https://www.youtube.com/watch?v=${video.id}`,
      raw: video,
    };
  },
};
