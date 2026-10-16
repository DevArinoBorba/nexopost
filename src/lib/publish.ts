import fs from 'fs';
import path from 'path';
import { decryptSecret, encryptSecret } from './crypto';
import { getProvider } from './platforms';
import type { PublishInput, TokenSet, AccountInfo } from './platforms';
import {
  db,
  getAccount,
  getPost,
  getTargets,
  updatePost,
  updateTarget,
  updateAccountTokens,
  type Account,
  type Post,
  type PostTarget,
} from './db';

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function guessMime(filePath: string): string {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/** Garante um access_token válido (renova se expirado). */
export async function validTokenSet(account: Account): Promise<TokenSet> {
  const provider = getProvider(account.platform);
  if (!provider) throw new Error(`Plataforma não suportada: ${account.platform}`);

  const access = account.access_token ? decryptSecret(account.access_token) : '';
  const refresh = account.refresh_token ? decryptSecret(account.refresh_token) : '';
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const needsRefresh = expiresAt > 0 && expiresAt - Date.now() < 60_000;

  if (needsRefresh && refresh) {
    const refreshed = await provider.refreshTokens(refresh);
    updateAccountTokens(account.id, {
      access_token: encryptSecret(refreshed.access_token),
      refresh_token: refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : null,
      token_expires_at: refreshed.expires_at ?? null,
      scope: refreshed.scope ?? null,
    });
    return refreshed;
  }

  return {
    access_token: access,
    refresh_token: refresh || undefined,
    expires_at: account.token_expires_at || undefined,
  };
}

function accountInfoOf(account: Account): AccountInfo {
  let meta: Record<string, unknown> | undefined;
  try {
    meta = account.meta ? JSON.parse(account.meta) : undefined;
  } catch {
    meta = undefined;
  }
  return {
    external_id: account.external_id || '',
    display_name: account.display_name || undefined,
    handle: account.handle || undefined,
    avatar_url: account.avatar_url || undefined,
    meta,
  };
}

/** Publica um único destino (plataforma) de um post. */
export async function publishTarget(target: PostTarget): Promise<PostTarget> {
  const post = getPost(target.post_id);
  if (!post) throw new Error('Post não encontrado');
  if (!target.account_id) throw new Error(`Sem conta conectada para ${target.platform}`);

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(target.account_id) as Account | undefined;
  if (!account) throw new Error(`Conta ${target.platform} não encontrada`);

  const provider = getProvider(target.platform);
  if (!provider) throw new Error(`Plataforma não suportada: ${target.platform}`);

  updateTarget(target.id, { status: 'publishing', attempts: target.attempts + 1, error: null });

  try {
    const tokens = await validTokenSet(account);
    let extraPaths: string[] = [];
    try {
      extraPaths = post.media_paths ? JSON.parse(post.media_paths) : [];
    } catch {
      extraPaths = [];
    }
    const input: PublishInput = {
      title: post.title || undefined,
      description: post.description || undefined,
      mediaType: post.media_type,
      filePath: post.media_path || undefined,
      filePaths: extraPaths.length ? extraPaths : post.media_path ? [post.media_path] : undefined,
      mimeType: post.media_path ? guessMime(post.media_path) : undefined,
      fileSize: post.media_size || undefined,
      privacy: post.privacy || (post.media_type === 'video' ? 'public' : undefined),
      format: (post.format as 'feed' | 'story' | 'reel') || 'feed',
    };

    const result = await provider.publish({ tokens, account: accountInfoOf(account), input });

    updateTarget(target.id, {
      status: 'published',
      external_post_id: result.external_post_id || null,
      post_url: result.post_url || null,
      published_at: new Date().toISOString(),
      error: null,
    });
    return { ...target, status: 'published', post_url: result.post_url || null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    updateTarget(target.id, { status: 'failed', error: msg });
    return { ...target, status: 'failed', error: msg };
  }
}

/** Publica todos os destinos de um post e atualiza o status geral. */
export async function publishPost(postId: string): Promise<PostTarget[]> {
  const post = getPost(postId);
  if (!post) throw new Error('Post não encontrado');

  updatePost(postId, { status: 'publishing' });
  const targets = getTargets(postId);
  const results: PostTarget[] = [];
  for (const t of targets) {
    results.push(await publishTarget(t));
  }

  const anyPublished = results.some((r) => r.status === 'published');
  const anyFailed = results.some((r) => r.status === 'failed');
  updatePost(postId, {
    status: anyPublished && !anyFailed ? 'published' : anyFailed ? 'failed' : 'published',
  });

  return results;
}

/** Executa posts agendados que já venceram. */
export async function runDuePosts(): Promise<{ processed: number; results: { post: string; targets: PostTarget[] }[] }> {
  const due = db
    .prepare("SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?")
    .all(new Date().toISOString()) as Post[];

  const out: { post: string; targets: PostTarget[] }[] = [];
  for (const p of due) {
    try {
      const targets = await publishPost(p.id);
      out.push({ post: p.id, targets });
    } catch (e) {
      updatePost(p.id, { status: 'failed' });
    }
  }
  return { processed: due.length, results: out };
}

/** Os arquivos enviados são salvos por saveMedia (em @/lib/paths). */
export { saveMedia } from './paths';
