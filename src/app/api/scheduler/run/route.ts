import { NextResponse } from 'next/server';
import { runDuePosts } from '@/lib/publish';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dispara a publicação dos posts agendados que já venceram.
// Chame periodicamente (cron / systemd timer) ou manualmente.
export async function POST() {
  const out = await runDuePosts();
  return NextResponse.json({ success: true, ...out });
}

export async function GET() {
  const out = await runDuePosts();
  return NextResponse.json({ success: true, ...out });
}
