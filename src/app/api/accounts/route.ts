import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { getAccounts, deleteAccount, type Account } from '@/lib/db';
import { listProviders } from '@/lib/platforms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function publicAccount(a: Account) {
  return {
    platform: a.platform,
    external_id: a.external_id,
    display_name: a.display_name,
    handle: a.handle,
    avatar_url: a.avatar_url,
    connected_at: a.created_at,
  };
}

export async function GET() {
  const profile = getActiveProfile();
  const accounts = getAccounts(profile.id).map(publicAccount);
  return NextResponse.json({
    profile: { id: profile.id, username: profile.username },
    accounts,
    providers: listProviders(),
  });
}

export async function DELETE(request: NextRequest) {
  const profile = getActiveProfile();
  const platform = new URL(request.url).searchParams.get('platform');
  if (!platform) {
    return NextResponse.json({ error: 'Parâmetro "platform" é obrigatório' }, { status: 400 });
  }
  const removed = deleteAccount(profile.id, platform);
  return NextResponse.json({ success: removed > 0, removed });
}
