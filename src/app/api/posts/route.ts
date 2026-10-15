import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { getPosts, getTargets, getPost } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serialize(postId: string) {
  const post = getPost(postId);
  if (!post) return null;
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    media_type: post.media_type,
    status: post.status,
    scheduled_at: post.scheduled_at,
    timezone: post.timezone,
    source_filename: post.source_filename,
    media_size: post.media_size,
    created_at: post.created_at,
    targets: getTargets(post.id).map((t) => ({
      platform: t.platform,
      status: t.status,
      post_url: t.post_url,
      error: t.error,
      published_at: t.published_at,
    })),
  };
}

export async function GET(request: NextRequest) {
  const profile = getActiveProfile();
  const limit = Number(new URL(request.url).searchParams.get('limit') || 50);
  const posts = getPosts(profile.id, Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({ posts: posts.map((p) => serialize(p.id)).filter(Boolean) });
}
