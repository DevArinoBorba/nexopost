import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile, getCurrentUser } from '@/lib/activeProfile';
import {
  createApiKey,
  getProfileById,
  getProfiles,
  listApiKeys,
  revokeApiKey,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const activeProfile = getActiveProfile();
    const profiles = getProfiles(user.id);
    const profileId = request.nextUrl.searchParams.get('profile_id') || undefined;

    const keys = listApiKeys(user.id, profileId);

    return NextResponse.json({
      success: true,
      activeProfile: { id: activeProfile.id, username: activeProfile.username },
      profiles: profiles.map((p) => ({ id: p.id, username: p.username })),
      apiKeys: keys,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const activeProfile = getActiveProfile();
    const body = await request.json().catch(() => ({}));

    const targetProfileId = String(body.profile_id || activeProfile.id).trim();
    const targetProfile = getProfileById(targetProfileId);
    if (!targetProfile || targetProfile.user_id !== user.id) {
      return NextResponse.json({ error: 'Perfil de cliente inválido.' }, { status: 400 });
    }

    const name = String(body.name || `Hermes Agent - ${targetProfile.username}`).trim();
    const { apiKey, rawToken } = createApiKey({
      user_id: user.id,
      profile_id: targetProfile.id,
      name,
    });

    return NextResponse.json(
      {
        success: true,
        apiKey,
        rawToken,
        apiKeys: listApiKeys(user.id),
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'ID da chave é obrigatório.' }, { status: 400 });
    }

    const removed = revokeApiKey(id, user.id);
    if (!removed) {
      return NextResponse.json({ error: 'Chave de API não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      apiKeys: listApiKeys(user.id),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
