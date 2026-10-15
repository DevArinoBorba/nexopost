import fs from 'fs';
import path from 'path';
import type { SocialProvider, TokenSet, AccountInfo, PublishInput, PublishResult } from './types';
import { ProviderError, fetchJson } from './types';
import {
  GRAPH,
  GRAPH_VIDEO,
  isConfigured,
  buildAuthUrl,
  exchangeForLongLived,
  listPages,
} from './meta';

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
];

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

function mimeOf(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function fileBlob(filePath: string): Blob {
  return new Blob([new Uint8Array(fs.readFileSync(filePath))], { type: mimeOf(filePath) });
}

export const facebookProvider: SocialProvider = {
  id: 'facebook',
  name: 'Facebook',
  supports: ['video', 'photo', 'text'],
  requiresPageSelection: true,

  isConfigured,

  getAuthUrl({ state }) {
    return buildAuthUrl({ platform: 'facebook', scopes: SCOPES, state });
  },

  exchangeCode({ code }) {
    return exchangeForLongLived({ platform: 'facebook', code });
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
      throw new ProviderError(
        'Nenhuma Página do Facebook encontrada. É preciso ter uma Página (não basta o perfil pessoal).',
        400
      );
    }
    const page = pages[0];
    if (!page.access_token) {
      throw new ProviderError('Não foi possível obter o token da Página. Verifique as permissões.', 400);
    }

    return {
      external_id: page.id,
      display_name: page.name,
      handle: page.name,
      avatar_url: page.picture?.data?.url,
      meta: { pageId: page.id, pageName: page.name },
      tokens: { access_token: page.access_token, expires_at: undefined },
    };
  },

  async publish({ tokens, account, input }): Promise<PublishResult> {
    const pageToken = tokens.access_token;
    if (!pageToken) throw new ProviderError('Token da Página do Facebook ausente.', 401);

    const pageId = account.external_id;
    const message = input.description || input.title || '';
    const files = input.filePaths?.length ? input.filePaths : input.filePath ? [input.filePath] : [];
    const isStory = input.format === 'story';

    // ================= VÍDEO =================
    if (input.mediaType === 'video') {
      if (!files[0] || !fs.existsSync(files[0])) throw new ProviderError('Arquivo de vídeo não encontrado.', 400);
      return isStory
        ? publishVideoStory(pageId, pageToken, files[0])
        : publishVideoFeed(pageId, pageToken, files[0], input.title, message);
    }

    // ================= FOTO(S) =================
    if (input.mediaType === 'photo') {
      if (files.length === 0) throw new ProviderError('Nenhuma imagem informada.', 400);

      if (isStory) {
        return publishPhotoStory(pageId, pageToken, files[0]);
      }

      if (files.length === 1) {
        const form = new FormData();
        form.append('access_token', pageToken);
        if (message) form.append('message', message);
        form.append('source', fileBlob(files[0]), path.basename(files[0]));
        const data = await fetchJson<{ id?: string; post_id?: string }>(`${GRAPH}/${pageId}/photos`, {
          method: 'POST',
          body: form,
        });
        const postId = data.post_id || data.id;
        return {
          external_post_id: postId,
          post_url: postId ? `https://www.facebook.com/${postId}` : undefined,
          raw: data,
        };
      }

      // Álbum: sobe as fotos não publicadas e cria um post com anexos
      const mediaIds: string[] = [];
      for (const f of files) {
        const form = new FormData();
        form.append('access_token', pageToken);
        form.append('published', 'false');
        form.append('source', fileBlob(f), path.basename(f));
        const up = await fetchJson<{ id: string }>(`${GRAPH}/${pageId}/photos`, { method: 'POST', body: form });
        mediaIds.push(up.id);
      }

      const feed = new URLSearchParams();
      feed.set('access_token', pageToken);
      if (message) feed.set('message', message);
      mediaIds.forEach((id, i) => feed.set(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));

      const post = await fetchJson<{ id: string }>(`${GRAPH}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: feed,
      });
      return {
        external_post_id: post.id,
        post_url: `https://www.facebook.com/${post.id}`,
        raw: { id: post.id, photos: mediaIds.length },
      };
    }

    // ================= TEXTO =================
    const data = await fetchJson<{ id?: string }>(`${GRAPH}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message, access_token: pageToken }),
    });
    return { external_post_id: data.id, post_url: data.id ? `https://www.facebook.com/${data.id}` : undefined, raw: data };
  },
};

// ============================================================
// Vídeo no feed (upload resumível)
// ============================================================
async function publishVideoFeed(
  pageId: string,
  pageToken: string,
  filePath: string,
  title: string | undefined,
  message: string
): Promise<PublishResult> {
  const size = fs.statSync(filePath).size;

  const start = await fetchJson<{
    video_id: string;
    upload_session_id: string;
    start_offset: string;
    end_offset: string;
  }>(
    `${GRAPH_VIDEO}/${pageId}/videos?${new URLSearchParams({
      upload_phase: 'start',
      file_size: String(size),
      access_token: pageToken,
    })}`,
    { method: 'POST' }
  );

  let offset = Number(start.start_offset || 0);
  const end = Number(start.end_offset || size);
  const fd = fs.openSync(filePath, 'r');
  try {
    while (offset < size) {
      const chunkLen = Math.min(CHUNK_SIZE, end - offset, size - offset);
      const buf = Buffer.alloc(chunkLen);
      fs.readSync(fd, buf, 0, chunkLen, offset);

      const form = new FormData();
      form.append('upload_phase', 'transfer');
      form.append('upload_session_id', start.upload_session_id);
      form.append('start_offset', String(offset));
      form.append('end_offset', String(offset + chunkLen));
      form.append('access_token', pageToken);
      form.append('video_file_chunk', new Blob([new Uint8Array(buf)]), 'chunk.bin');

      const res = await fetchJson<{ start_offset?: string; end_offset?: string }>(`${GRAPH_VIDEO}/${pageId}/videos`, {
        method: 'POST',
        body: form,
      });
      offset = Number(res.end_offset || offset + chunkLen);
      if (res.end_offset === undefined) break;
    }
  } finally {
    fs.closeSync(fd);
  }

  const form = new FormData();
  form.append('upload_phase', 'finish');
  form.append('upload_session_id', start.upload_session_id);
  form.append('access_token', pageToken);
  if (title) form.append('title', title);
  if (message) form.append('description', message);
  const finish = await fetchJson<{ success?: boolean; video_id?: string }>(`${GRAPH_VIDEO}/${pageId}/videos`, {
    method: 'POST',
    body: form,
  });

  const videoId = start.video_id;
  return {
    external_post_id: videoId,
    post_url: `https://www.facebook.com/${pageId}/videos/${videoId}`,
    raw: finish,
  };
}

// ============================================================
// Vídeo como Story
// ============================================================
async function publishVideoStory(pageId: string, pageToken: string, filePath: string): Promise<PublishResult> {
  const size = fs.statSync(filePath).size;

  const start = await fetchJson<{ video_id: string; upload_url: string }>(
    `${GRAPH}/${pageId}/video_stories`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ upload_phase: 'start', access_token: pageToken }),
    }
  );

  const uploadRes = await fetch(start.upload_url, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${pageToken}`,
      offset: '0',
      file_size: String(size),
      'Content-Type': mimeOf(filePath),
    },
    body: new Uint8Array(fs.readFileSync(filePath)),
  });
  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) {
    throw new ProviderError(`Falha ao enviar o vídeo do story: ${uploadText.slice(0, 200)}`, uploadRes.status);
  }

  const finish = await fetchJson<{ success?: boolean; post_id?: string }>(`${GRAPH}/${pageId}/video_stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ video_id: start.video_id, upload_phase: 'finish', access_token: pageToken }),
  });

  return {
    external_post_id: finish.post_id || start.video_id,
    post_url: finish.post_id ? `https://www.facebook.com/stories/${finish.post_id}` : undefined,
    raw: finish,
  };
}

// ============================================================
// Foto como Story
// ============================================================
async function publishPhotoStory(pageId: string, pageToken: string, filePath: string): Promise<PublishResult> {
  // 1) Sobe a foto como não publicada
  const form = new FormData();
  form.append('access_token', pageToken);
  form.append('published', 'false');
  form.append('source', fileBlob(filePath), path.basename(filePath));
  const photo = await fetchJson<{ id: string }>(`${GRAPH}/${pageId}/photos`, { method: 'POST', body: form });

  // 2) Publica como story
  const story = await fetchJson<{ success?: boolean; post_id?: string }>(`${GRAPH}/${pageId}/photo_stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ photo_id: photo.id, access_token: pageToken }),
  });

  return {
    external_post_id: story.post_id || photo.id,
    post_url: story.post_id ? `https://www.facebook.com/stories/${story.post_id}` : undefined,
    raw: story,
  };
}
