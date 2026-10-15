import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { getPost, updatePost, deletePost } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const profile = getActiveProfile();
  const post = getPost(params.id);
  if (!post || post.profile_id !== profile.id) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.scheduled_date) {
    const when = new Date(body.scheduled_date);
    if (isNaN(when.getTime())) return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    data.scheduled_at = when.toISOString();
    data.status = 'scheduled';
  }
  if (typeof body.title === 'string') data.title = body.title;
  if (typeof body.description === 'string') data.description = body.description;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }

  updatePost(params.id, data);
  return NextResponse.json({ success: true, id: params.id, ...data });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const profile = getActiveProfile();
  const post = getPost(params.id);
  if (!post || post.profile_id !== profile.id) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }
  deletePost(params.id);
  return NextResponse.json({ success: true, message: 'Post cancelado e removido.' });
}
