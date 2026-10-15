import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/platforms';
import { verifyState, encryptSecret } from '@/lib/crypto';
import { takePendingOAuth, upsertAccount, getProfileById, createMetaSession } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function appUrl(request: NextRequest): string {
  return process.env.APP_URL || new URL(request.url).origin;
}

function back(request: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/accounts', appUrl(request));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const provider = getProvider(params.platform);
  if (!provider) return back(request, { error: 'Plataforma não suportada' });

  const sp = new URL(request.url).searchParams;
  const providerError = sp.get('error');
  if (providerError) {
    console.error('[oauth callback] erro do provedor:', providerError, sp.get('error_description') || '');
    return back(request, { error: sp.get('error_description') || providerError });
  }

  const code = sp.get('code');
  const state = sp.get('state');
  if (!code || !state) {
    console.error('[oauth callback] faltando code/state');
    return back(request, { error: 'Resposta OAuth inválida' });
  }

  try {
    const parsed = verifyState<{ platform: string; profile_id: string }>(state);
    if (parsed.platform !== provider.id) return back(request, { error: 'Plataforma divergente no state' });

    const pending = takePendingOAuth(state);
    const profileId = pending?.profile_id || parsed.profile_id;
    const profile = getProfileById(profileId);
    if (!profile) return back(request, { error: 'Perfil não encontrado' });

    const tokens = await provider.exchangeCode({ code, codeVerifier: pending?.code_verifier || undefined });

    // Provedores Meta: guarda o token e deixa o usuário escolher as Páginas
    if (provider.requiresPageSelection) {
      const sessionId = createMetaSession(encryptSecret(tokens.access_token));
      return back(request, { meta_session: sessionId });
    }

    const info = await provider.getAccountInfo(tokens);

    // Salva uma conta (e as vinculadas, ex.: Página do Facebook junto do Instagram)
    const store = (
      platform: string,
      accountInfo: typeof info,
      baseTokens: typeof tokens
    ) => {
      const stored = { ...baseTokens, ...(accountInfo.tokens || {}) };
      upsertAccount({
        profile_id: profile.id,
        platform,
        external_id: accountInfo.external_id,
        display_name: accountInfo.display_name || null,
        handle: accountInfo.handle || null,
        avatar_url: accountInfo.avatar_url || null,
        access_token: encryptSecret(stored.access_token),
        refresh_token: stored.refresh_token ? encryptSecret(stored.refresh_token) : null,
        token_expires_at: stored.expires_at || null,
        scope: stored.scope || null,
        meta: accountInfo.meta ? JSON.stringify(accountInfo.meta) : null,
      });
    };

    store(provider.id, info, tokens);
    for (const linked of info.linked || []) {
      store(linked.platform, linked.info, { ...tokens, ...(linked.info.tokens || {}) });
    }

    return back(request, { connected: provider.id });
  } catch (e) {
    console.error('[oauth callback] falha:', (e as Error).message);
    return back(request, { error: (e as Error).message });
  }
}
