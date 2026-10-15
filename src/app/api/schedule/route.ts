import { NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { db } from '@/lib/db';
import { getTargets, type Post } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = getActiveProfile();
  const posts = db
    .prepare("SELECT * FROM posts WHERE profile_id = ? AND status = 'scheduled' AND scheduled_at IS NOT NULL ORDER BY scheduled_at")
    .all(profile.id) as Post[];

  return NextResponse.json({
    scheduled_posts: posts.map((p) => ({
      job_id: p.id,
      id: p.id,
      scheduled_date: p.scheduled_at,
      post_type: p.media_type,
      title: p.title,
      description: p.description,
      timezone: p.timezone,
      source_filename: p.source_filename,
      platforms: getTargets(p.id).map((t) => t.platform),
    })),
    total: posts.length,
  });
}
