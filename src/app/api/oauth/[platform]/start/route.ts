import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/platforms';
import { getActiveProfile } from '@/lib/activeProfile';
import { signState, randomToken, pkceVerifier, pkceChallenge } from '@/lib/crypto';
import { savePendingOAuth } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const provider = getProvider(params.platform);
  if (!provider) {
    return NextResponse.json({ error: 'Plataforma não suportada' }, { status: 404 });
  }
  if (!provider.isConfigured()) {
    return NextResponse.json(
      {
        error: `${provider.name} não está configurado. Defina as credenciais no .env.local.`,
        required: provider.id === 'youtube' ? ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] : [],
      },
      { status: 400 }
    );
  }

  const profile = getActiveProfile();
  const state = signState({
    platform: provider.id,
    profile_id: profile.id,
    nonce: randomToken(8),
    exp: Date.now() + 10 * 60 * 1000,
  });

  // PKCE (usado pelo TikTok)
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  if (provider.usesPkce) {
    codeVerifier = pkceVerifier();
    codeChallenge = pkceChallenge(codeVerifier);
  }

  savePendingOAuth(state, provider.id, profile.id, codeVerifier);

  return NextResponse.redirect(provider.getAuthUrl({ state, codeVerifier, codeChallenge }));
}
