import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiKeyAuth';
import { createPost, createTarget, getAccounts, getTargets } from '@/lib/db';
import { publishPost, saveMedia } from '@/lib/publish';
import { notifyPostScheduled } from '@/lib/whatsappNotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function detectMediaTypeFromFilename(filename: string, fallback: 'video' | 'photo' | 'text' = 'video'): 'video' | 'photo' | 'text' {
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return 'photo';
  if (['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi'].includes(ext)) return 'video';
  return fallback;
}

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  try {
    const { profile } = auth;
    const contentType = (request.headers.get('content-type') || '').toLowerCase();

    let title = '';
    let description = '';
    let platforms: string[] = [];
    let accountIds: string[] = [];
    let scheduledAt: string | null = null;
    let timezone: string | null = null;
    let mediaType: 'video' | 'photo' | 'text' | null = null;
    let privacy: string | undefined = undefined;
    let format = 'feed';
    let localMediaPaths: string[] = [];
    let mediaBase64: string | null = null;
    let mediaBase64Filename = 'upload.mp4';
    let mediaUrl: string | null = null;
    const uploadedFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      title = String(form.get('title') || '');
      description = String(form.get('description') || '');

      const rawPlatforms = form.getAll('platforms').concat(form.getAll('platform')).map(String);
      for (const item of rawPlatforms) {
        if (item.startsWith('[')) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) platforms.push(...parsed.map(String));
          } catch {
            platforms.push(item);
          }
        } else if (item.includes(',')) {
          platforms.push(...item.split(',').map((s) => s.trim()).filter(Boolean));
        } else if (item.trim()) {
          platforms.push(item.trim());
        }
      }

      accountIds = Array.from(new Set(form.getAll('account_id').map(String).filter(Boolean)));
      scheduledAt = (form.get('scheduled_at') as string) || null;
      timezone = (form.get('timezone') as string) || null;
      const mt = (form.get('media_type') as string) || '';
      if (mt === 'video' || mt === 'photo' || mt === 'text') mediaType = mt;
      privacy = (form.get('privacy') as string) || undefined;
      format = (form.get('format') as string) || 'feed';

      const localPathField = form.get('local_media_path') as string | null;
      if (localPathField?.trim()) localMediaPaths.push(localPathField.trim());

      const files = (form.getAll('media') as File[]).filter((f) => f && f.size > 0);
      uploadedFiles.push(...files);
    } else {
      const body = await request.json().catch(() => ({}));
      title = String(body.title || '');
      description = String(body.description || '');

      if (Array.isArray(body.platforms)) {
        platforms = body.platforms.map((p: unknown) => String(p).trim().toLowerCase()).filter(Boolean);
      } else if (typeof body.platforms === 'string') {
        platforms = body.platforms.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      } else if (typeof body.platform === 'string') {
        platforms = [body.platform.trim().toLowerCase()];
      }

      if (Array.isArray(body.account_ids)) {
        accountIds = body.account_ids.map(String).filter(Boolean);
      }

      scheduledAt = body.scheduled_at ? String(body.scheduled_at).trim() : null;
      timezone = body.timezone ? String(body.timezone).trim() : null;
      if (body.media_type === 'video' || body.media_type === 'photo' || body.media_type === 'text') {
        mediaType = body.media_type;
      }
      privacy = body.privacy ? String(body.privacy) : undefined;
      format = body.format ? String(body.format) : 'feed';

      if (typeof body.local_media_path === 'string' && body.local_media_path.trim()) {
        localMediaPaths.push(body.local_media_path.trim());
      }
      if (Array.isArray(body.local_media_paths)) {
        for (const p of body.local_media_paths) {
          if (typeof p === 'string' && p.trim()) localMediaPaths.push(p.trim());
        }
      }
      if (typeof body.media_base64 === 'string' && body.media_base64.trim()) {
        mediaBase64 = body.media_base64.trim();
        mediaBase64Filename = String(body.filename || body.source_filename || 'upload.mp4');
      }
      if (typeof body.media_url === 'string' && body.media_url.trim()) {
        mediaUrl = body.media_url.trim();
      }
    }

    platforms = Array.from(new Set(platforms.map((p) => p.toLowerCase())));

    const availableAccounts = getAccounts(profile.id);
    const destinations = accountIds.length
      ? accountIds.map((id) => availableAccounts.find((a) => a.id === id))
      : platforms.map((platform) => {
          const matches = availableAccounts.filter((a) => a.platform === platform);
          return matches[0];
        });

    if (destinations.length === 0 || destinations.some((a) => !a)) {
      const missingPlatforms = platforms.filter(
        (plat) => !availableAccounts.some((a) => a.platform === plat)
      );
      return NextResponse.json(
        {
          success: false,
          error:
            missingPlatforms.length > 0
              ? `O perfil "${profile.username}" não possui conta conectada para: ${missingPlatforms.join(', ')}. Contas conectadas: ${
                  availableAccounts.map((a) => a.platform).join(', ') || 'nenhuma'
                }.`
              : 'Selecione ao menos uma plataforma válida conectada neste perfil.',
        },
        { status: 400 }
      );
    }

    // Processar mídias (upload binário, local_media_path, base64 ou URL)
    const mediaPaths: string[] = [];
    let mediaSize: number | null = null;
    let sourceFilename: string | null = null;

    for (const file of uploadedFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = saveMedia(buffer, file.name || 'upload.bin');
      mediaPaths.push(saved.filePath);
      if (!mediaSize) mediaSize = file.size;
      if (!sourceFilename) sourceFilename = file.name || path.basename(saved.filePath);
    }

    for (const localPath of localMediaPaths) {
      let resolvedPath = localPath;
      if (!fs.existsSync(resolvedPath)) {
        // Caso o caminho aponte para /data/nexopost/data/... no host da VPS e estejamos no container (/app/data/...)
        const hostPrefix = '/data/nexopost/data/';
        if (resolvedPath.startsWith(hostPrefix)) {
          const containerCandidate = path.join('/app/data', resolvedPath.slice(hostPrefix.length));
          if (fs.existsSync(containerCandidate)) {
            resolvedPath = containerCandidate;
          }
        }
      }
      if (!fs.existsSync(resolvedPath)) {
        return NextResponse.json(
          {
            success: false,
            error: `Arquivo local não encontrado em "${localPath}". Envie via multipart/form-data (campo "media") ou coloque em /data/nexopost/data/media.`,
          },
          { status: 400 }
        );
      }
      const buffer = fs.readFileSync(resolvedPath);
      const origName = path.basename(resolvedPath);
      const saved = saveMedia(buffer, origName);
      mediaPaths.push(saved.filePath);
      if (!mediaSize) mediaSize = buffer.length;
      if (!sourceFilename) sourceFilename = origName;
    }

    if (mediaBase64) {
      const cleanB64 = mediaBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanB64, 'base64');
      const saved = saveMedia(buffer, mediaBase64Filename);
      mediaPaths.push(saved.filePath);
      if (!mediaSize) mediaSize = buffer.length;
      if (!sourceFilename) sourceFilename = mediaBase64Filename;
    }

    if (mediaUrl) {
      const res = await fetch(mediaUrl);
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Falha ao baixar media_url (${res.status}).` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const urlFilename = path.basename(new URL(mediaUrl).pathname) || 'remote-media.mp4';
      const saved = saveMedia(buffer, urlFilename);
      mediaPaths.push(saved.filePath);
      if (!mediaSize) mediaSize = buffer.length;
      if (!sourceFilename) sourceFilename = urlFilename;
    }

    const finalMediaType: 'video' | 'photo' | 'text' =
      mediaType || (sourceFilename ? detectMediaTypeFromFilename(sourceFilename, 'video') : 'text');

    if (finalMediaType !== 'text' && mediaPaths.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhuma mídia recebida. Envie "media" (multipart), "local_media_path", "media_base64" ou "media_url".',
        },
        { status: 400 }
      );
    }

    if (finalMediaType === 'text' && !title.trim() && !description.trim()) {
      return NextResponse.json(
        { success: false, error: 'Informe title ou description para post de texto.' },
        { status: 400 }
      );
    }

    if (scheduledAt) {
      const parsedDate = new Date(scheduledAt);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'scheduled_at inválido. Use formato ISO 8601 (ex: 2026-10-25T18:00:00-04:00).' },
          { status: 400 }
        );
      }
      scheduledAt = parsedDate.toISOString();
    }

    const post = createPost({
      profile_id: profile.id,
      title: title || sourceFilename || 'Publicação via API',
      description,
      media_type: finalMediaType,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt,
      timezone,
      privacy,
      format,
      media_paths: mediaPaths,
      source_filename: sourceFilename,
      media_path: mediaPaths[0] || null,
      media_size: mediaSize,
    });

    const targetPlatforms: string[] = [];
    for (const account of destinations) {
      if (account) {
        createTarget({ post_id: post.id, platform: account.platform, account_id: account.id });
        targetPlatforms.push(account.platform);
      }
    }

    if (scheduledAt) {
      await notifyPostScheduled(post.id, targetPlatforms).catch(() => {});
      return NextResponse.json(
        {
          success: true,
          post_id: post.id,
          profile: profile.username,
          status: 'scheduled',
          scheduled_at: scheduledAt,
          media_type: finalMediaType,
          format,
          platforms: targetPlatforms,
        },
        { status: 201 }
      );
    }

    const targets = await publishPost(post.id);
    const reRead = getTargets(post.id);
    const anyFailed = reRead.some((t) => t.status === 'failed');

    return NextResponse.json(
      {
        success: !anyFailed,
        post_id: post.id,
        profile: profile.username,
        status: anyFailed ? 'failed' : 'published',
        platforms: targetPlatforms,
        results: targets.map((t) => ({
          platform: t.platform,
          success: t.status === 'published',
          post_url: t.post_url,
          error: t.error,
        })),
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
  }
}
