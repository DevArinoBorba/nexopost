import { NextRequest, NextResponse } from 'next/server';
import { listProfiles, getCurrentUser } from '@/lib/activeProfile';
import { createProfile, getProfiles, deleteProfile, getProfileById } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ profiles: listProfiles() });
}

export async function POST(request: NextRequest) {
  const user = getCurrentUser();
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Informe o nome do cliente.' }, { status: 400 });
  }
  const existing = getProfiles(user.id).find((p) => p.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return NextResponse.json({ error: 'Já existe um cliente com esse nome.' }, { status: 400 });
  }

  const profile = createProfile(user.id, username);
  return NextResponse.json({ success: true, profile });
}

export async function DELETE(request: NextRequest) {
  const user = getCurrentUser();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Parâmetro "id" obrigatório' }, { status: 400 });

  const profile = getProfileById(id);
  if (!profile || profile.user_id !== user.id) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  // Impede remover o último perfil
  if (getProfiles(user.id).length <= 1) {
    return NextResponse.json({ error: 'Não é possível remover o único cliente.' }, { status: 400 });
  }

  deleteProfile(id);
  return NextResponse.json({ success: true });
}
