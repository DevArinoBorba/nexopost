import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiKeyAuth';
import { db, deletePost, getPost, getTargets, type Post } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  const { profile } = auth;
  const statusFilter = request.nextUrl.searchParams.get('status') || 'scheduled';

  const posts =
    statusFilter === 'all'
      ? (db
          .prepare('SELECT * FROM posts WHERE profile_id = ? ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 100')
          .all(profile.id) as Post[])
      : (db
          .prepare(
            "SELECT * FROM posts WHERE profile_id = ? AND status = 'scheduled' AND scheduled_at IS NOT NULL ORDER BY scheduled_at ASC"
          )
          .all(profile.id) as Post[]);

  return NextResponse.json({
    success: true,
    profile: profile.username,
    scheduled_posts: posts.map((p) => {
      const targets = getTargets(p.id);
      return {
        id: p.id,
        job_id: p.id,
        title: p.title,
        description: p.description,
        media_type: p.media_type,
        format: p.format || 'feed',
        status: p.status,
        scheduled_date: p.scheduled_at,
        timezone: p.timezone,
        source_filename: p.source_filename,
        platforms: targets.map((t) => t.platform),
        targets: targets.map((t) => ({
          platform: t.platform,
          status: t.status,
          post_url: t.post_url,
          error: t.error,
          published_at: t.published_at,
        })),
        created_at: p.created_at,
      };
    }),
    total: posts.length,
  });
}

export async function DELETE(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  const { profile } = auth;
  const id =
    request.nextUrl.searchParams.get('id') ||
    request.nextUrl.searchParams.get('post_id') ||
    '';

  if (!id) {
    return NextResponse.json({ success: false, error: 'Parâmetro "id" é obrigatório.' }, { status: 400 });
  }

  const post = getPost(id);
  if (!post || post.profile_id !== profile.id) {
    return NextResponse.json(
      { success: false, error: 'Agendamento não encontrado neste perfil.' },
      { status: 404 }
    );
  }

  deletePost(id);
  return NextResponse.json({
    success: true,
    deleted_id: id,
    profile: profile.username,
  });
}
