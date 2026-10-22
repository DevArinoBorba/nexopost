import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { createPost, createTarget, getAccounts, getTargets, updatePost } from '@/lib/db';
import { publishPost, saveMedia, guessMime } from '@/lib/publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const profile = getActiveProfile();
    const form = await request.formData();

    const title = (form.get('title') as string) || '';
    const description = (form.get('description') as string) || '';
    const platformsRaw = form.getAll('platform') as string[];
    const platforms = platformsRaw.length ? platformsRaw : [];
    const accountIds = Array.from(new Set(form.getAll('account_id') as string[]));
    const available = getAccounts(profile.id);
    const destinations = accountIds.length
      ? accountIds.map((id) => available.find((a) => a.id === id))
      : Array.from(new Set(platforms)).map((platform) => {
          const matches = available.filter((a) => a.platform === platform);
          return matches.length === 1 ? matches[0] : undefined;
        });
    if (!destinations.length || destinations.some((a) => !a)) {
      return NextResponse.json({ error: 'Selecione contas válidas e específicas deste cliente.' }, { status: 400 });
    }
    const scheduledAt = (form.get('scheduled_at') as string) || null;
    const timezone = (form.get('timezone') as string) || null;
    const mediaType = ((form.get('media_type') as string) || 'video') as 'video' | 'photo' | 'text';
    const privacy = (form.get('privacy') as string) || undefined;
    const format = (form.get('format') as string) || 'feed';

    if (destinations.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos uma plataforma.' }, { status: 400 });
    }
    if (mediaType === 'text' && !title.trim()) {
      return NextResponse.json({ error: 'Escreva o texto do post.' }, { status: 400 });
    }

    // 1) Salvar mÃ­dia (uma ou vÃ¡rias)
    let mediaPath: string | null = null;
    let mediaPaths: string[] = [];
    let mediaSize: number | null = null;
    let sourceFilename: string | null = null;
    const files = (form.getAll('media') as File[]).filter((f) => f && f.size > 0);
    if (mediaType !== 'text' && files.length > 0) {
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = saveMedia(buffer, file.name || 'upload.bin');
        mediaPaths.push(saved.filePath);
      }
      mediaPath = mediaPaths[0];
      mediaSize = files[0].size;
      sourceFilename = files[0].name || null;
    }

    if (mediaType !== 'text' && mediaPaths.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo vÃ¡lido foi enviado.' }, { status: 400 });
    }
    if (mediaType === 'photo' && format === 'story' && mediaPaths.length > 1) {
      return NextResponse.json({ error: 'Story aceita apenas uma mÃ­dia.' }, { status: 400 });
    }

    // 2) Criar o post
    const post = createPost({
      profile_id: profile.id,
      title,
      description,
      media_type: mediaType,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt,
      timezone,
      privacy,
      format,
      media_paths: mediaPaths,
      source_filename: sourceFilename,
      media_path: mediaPath,
      media_size: mediaSize,
    });

    // 3) Criar um destino por plataforma
    for (const account of destinations) {
      if (account) createTarget({ post_id: post.id, platform: account.platform, account_id: account.id });
    }

    // 4) Agendado â†’ nÃ£o publica agora
    if (scheduledAt) {
      return NextResponse.json({
        success: true,
        post_id: post.id,
        status: 'scheduled',
        scheduled_at: scheduledAt,
        platforms,
      });
    }

    // 5) Publicar agora
    const targets = await publishPost(post.id);
    const reRead = getTargets(post.id);
    const anyFailed = reRead.some((t) => t.status === 'failed');

    return NextResponse.json({
      success: !anyFailed,
      post_id: post.id,
      status: anyFailed ? 'failed' : 'published',
      results: targets.map((t) => ({
        platform: t.platform,
        success: t.status === 'published',
        post_url: t.post_url,
        error: t.error,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
