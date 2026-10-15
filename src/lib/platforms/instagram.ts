import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { SocialProvider, TokenSet, AccountInfo, PublishInput, PublishResult } from './types';
import { ProviderError, fetchJson } from './types';
import {
  GRAPH,
  isConfigured,
  buildAuthUrl,
  exchangeForLongLived,
  listPages,
  instagramBusinessAccount,
  igProfile,
} from './meta';

const execFileAsync = promisify(execFile);

const SCOPES = [
  // Instagram
  'instagram_basic',
  'instagram_content_publish',
  // Facebook (Página) — para que uma única autorização publique nos dois
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
];

const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];

function appUrl(): string {
  return (process.env.MEDIA_PUBLIC_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** O Instagram exige que a mídia esteja acessível publicamente por HTTPS. */
export function publicMediaUrl(filePath: string): string {
  const base = appUrl();
  const host = (() => {
    try {
      return new URL(base).hostname;
    } catch {
      return 'localhost';
    }
  })();

  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    throw new ProviderError(
      'O Instagram exige que a mídia esteja numa URL pública HTTPS. ' +
        'Configure MEDIA_PUBLIC_URL com um endereço público (ex.: túnel cloudflared) para publicar no Instagram.',
      400
    );
  }

  const name = path.basename(filePath);
  return `${base}/api/media/${encodeURIComponent(name)}`;
}

/** O Instagram só aceita JPEG — converte se necessário. */
async function ensureJpeg(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return filePath;
  if (VIDEO_EXT.includes(ext)) return filePath;

  const out = filePath.replace(/\.[^.]+$/, '') + '-conv.jpg';
  try {
    await execFileAsync('ffmpeg', ['-y', '-i', filePath, '-q:v', '2', out], { timeout: 60_000 });
    if (fs.existsSync(out)) return out;
  } catch {
    // segue com o original (o Instagram pode recusar)
  }
  return filePath;
}

function isVideo(filePath: string): boolean {
  return VIDEO_EXT.includes(path.extname(filePath).toLowerCase());
}

async function createContainer(
  token: string,
  igUserId: string,
  params: Record<string, string | undefined>
): Promise<string> {
  const body = new URLSearchParams({ access_token: token });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') body.set(k, v);
  }
  const data = await fetchJson<{ id: string; error?: { message?: string } }>(`${GRAPH}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return data.id;
}

async function waitContainer(containerId: string, token: string, timeoutMs = 240_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = await fetchJson<{ status_code?: string; status?: string }>(
      `${GRAPH}/${containerId}?${new URLSearchParams({ fields: 'status_code,status', access_token: token })}`
    );
    const code = data.status_code || data.status;
    if (code === 'FINISHED' || code === 'PUBLISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new ProviderError(`Processamento do Instagram falhou (${code}).`, 400, data);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new ProviderError('Tempo esgotado aguardando o processamento do Instagram.', 504);
}

async function publishContainer(token: string, igUserId: string, containerId: string): Promise<string> {
  // O Instagram às vezes ainda não conseguiu baixar a mídia da URL pública;
  // tenta novamente algumas vezes antes de desistir.
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const published = await fetchJson<{ id: string }>(`${GRAPH}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ creation_id: containerId, access_token: token }),
      });
      return published.id;
    } catch (e) {
      lastError = e;
      const msg = (e as Error).message || '';
      const transient =
        /does not exist|not ready|not available|please try again|temporarily/i.test(msg) || attempt < 3;
      if (!transient || attempt === 4) break;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderError('Falha ao publicar no Instagram.', 500);
}

export const instagramProvider: SocialProvider = {
  id: 'instagram',
  name: 'Instagram',
  supports: ['video', 'photo'],
  requiresPageSelection: true,

  isConfigured,

  getAuthUrl({ state }) {
    return buildAuthUrl({ platform: 'instagram', scopes: SCOPES, state });
  },

  exchangeCode({ code }) {
    return exchangeForLongLived({ platform: 'instagram', code });
  },

  async refreshTokens(refreshToken) {
    const c = { clientId: process.env.META_CLIENT_ID || '', clientSecret: process.env.META_CLIENT_SECRET || '' };
    const data = await fetchJson<{ access_token: string; expires_in?: number }>(
      `${GRAPH}/oauth/access_token?${new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: c.clientId,
        client_secret: c.clientSecret,
        fb_exchange_token: refreshToken,
      })}`
    );
    return { access_token: data.access_token };
  },

  async getAccountInfo(tokens): Promise<AccountInfo> {
    const pages = await listPages(tokens.access_token);
    if (pages.length === 0) {
      throw new ProviderError('Nenhuma Página do Facebook encontrada para vincular ao Instagram.', 400);
    }

    for (const page of pages) {
      if (!page.access_token) continue;
      const igId = await instagramBusinessAccount(page.id, page.access_token);
      if (!igId) continue;

      const profile = await igProfile(igId, page.access_token);
      return {
        external_id: igId,
        display_name: profile.name || profile.username || 'Instagram',
        handle: profile.username ? `@${profile.username}` : undefined,
        avatar_url: profile.profile_picture_url,
        meta: { igUserId: igId, pageId: page.id, followers: profile.followers_count },
        tokens: { access_token: page.access_token, expires_at: undefined },
        linked: [
          {
            platform: 'facebook',
            info: {
              external_id: page.id,
              display_name: page.name,
              handle: page.name,
              avatar_url: page.picture?.data?.url,
              meta: { pageId: page.id, pageName: page.name },
              tokens: { access_token: page.access_token, expires_at: undefined },
            },
          },
        ],
      };
    }

    throw new ProviderError(
      'Nenhuma conta do Instagram Business encontrada. O Instagram precisa ser uma conta Business/Creator ' +
        'vinculada a uma Página do Facebook.',
      400
    );
  },

  async publish({ tokens, account, input }): Promise<PublishResult> {
    const token = tokens.access_token;
    if (!token) throw new ProviderError('Token do Instagram ausente.', 401);
    if (input.mediaType === 'text') {
      throw new ProviderError('O Instagram não aceita posts apenas de texto.', 400);
    }

    const files = input.filePaths?.length ? input.filePaths : input.filePath ? [input.filePath] : [];
    if (files.length === 0) throw new ProviderError('Nenhuma mídia informada.', 400);
    for (const f of files) {
      if (!fs.existsSync(f)) throw new ProviderError(`Arquivo não encontrado: ${path.basename(f)}`, 400);
    }

    const igUserId = account.external_id;
    const caption = input.description || input.title || '';
    const isStory = input.format === 'story';

    // ---------- Stories (foto ou vídeo) ----------
    if (isStory) {
      const file = files[0];
      let url: string;
      if (isVideo(file)) {
        url = publicMediaUrl(file);
        const container = await createContainer(token, igUserId, {
          media_type: 'STORIES',
          video_url: url,
        });
        await waitContainer(container, token);
        const id = await publishContainer(token, igUserId, container);
        return { external_post_id: id, post_url: `https://www.instagram.com/stories/${id}`, raw: { id, format: 'story' } };
      }
      const jpeg = await ensureJpeg(file);
      url = publicMediaUrl(jpeg);
      const container = await createContainer(token, igUserId, {
        media_type: 'STORIES',
        image_url: url,
      });
      const id = await publishContainer(token, igUserId, container);
      return { external_post_id: id, post_url: `https://www.instagram.com/stories/${id}`, raw: { id, format: 'story' } };
    }

    // ---------- Vídeo (Reels) ----------
    if (input.mediaType === 'video') {
      const url = publicMediaUrl(files[0]);
      const container = await createContainer(token, igUserId, {
        media_type: 'REELS',
        video_url: url,
        caption,
      });
      await waitContainer(container, token);
      const id = await publishContainer(token, igUserId, container);
      return { external_post_id: id, post_url: `https://www.instagram.com/reel/${id}/`, raw: { id, format: 'reel' } };
    }

    // ---------- Fotos (única ou carrossel) ----------
    const prepared: string[] = [];
    for (const f of files) {
      prepared.push(isVideo(f) ? f : await ensureJpeg(f));
    }

    // Carrossel (2 a 10 itens, fotos e/ou vídeos)
    if (prepared.length > 1) {
      if (prepared.length > 10) {
        throw new ProviderError('O carrossel do Instagram aceita no máximo 10 itens.', 400);
      }
      const children: string[] = [];
      for (const f of prepared) {
        const child = await createContainer(token, igUserId, {
          is_carousel_item: 'true',
          ...(isVideo(f) ? { media_type: 'VIDEO', video_url: publicMediaUrl(f) } : { image_url: publicMediaUrl(f) }),
        });
        children.push(child);
      }
      // Aguarda todos os itens de vídeo ficarem prontos
      for (const child of children) {
        await waitContainer(child, token).catch(() => {});
      }
      const parent = await createContainer(token, igUserId, {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption,
      });
      await waitContainer(parent, token);
      const id = await publishContainer(token, igUserId, parent);
      return {
        external_post_id: id,
        post_url: `https://www.instagram.com/p/${id}/`,
        raw: { id, format: 'carousel', items: children.length },
      };
    }

    // Foto única
    const container = await createContainer(token, igUserId, {
      image_url: publicMediaUrl(prepared[0]),
      caption,
    });
    const id = await publishContainer(token, igUserId, container);
    return { external_post_id: id, post_url: `https://www.instagram.com/p/${id}/`, raw: { id, format: 'image' } };
  },
};
