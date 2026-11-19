import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateApiKey,
  getProfiles,
  type Profile,
  type PublicApiKey,
  type User,
} from './db';

export type ApiKeyAuthResult =
  | {
      ok: true;
      apiKey: PublicApiKey;
      profile: Profile;
      user: User;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function normalizeProfileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function requireApiKey(request: NextRequest): ApiKeyAuthResult {
  const authHeader = request.headers.get('authorization') || '';
  const xApiKey = request.headers.get('x-api-key') || '';

  let rawToken = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    rawToken = authHeader.slice(7).trim();
  } else if (xApiKey.trim()) {
    rawToken = xApiKey.trim();
  }

  if (!rawToken) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Cabeçalho Authorization: Bearer nex_live_... ausente.',
        },
        { status: 401 }
      ),
    };
  }

  const auth = authenticateApiKey(rawToken);
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Chave de API inválida, revogada ou perfil inexistente.',
        },
        { status: 401 }
      ),
    };
  }

  // Permite operar qualquer perfil (conta dark) do mesmo usuário via ?profile=... ou X-NexoPost-Profile
  const requestedProfile = (
    request.headers.get('x-nexopost-profile') ||
    request.nextUrl.searchParams.get('profile') ||
    ''
  ).trim();

  let targetProfile = auth.profile;
  if (requestedProfile) {
    const userProfiles = getProfiles(auth.user.id);
    const normQuery = normalizeProfileName(requestedProfile);
    const matched =
      userProfiles.find((p) => p.id === requestedProfile) ||
      userProfiles.find((p) => normalizeProfileName(p.username) === normQuery) ||
      userProfiles.find((p) => {
        const normName = normalizeProfileName(p.username);
        return normName.includes(normQuery) || normQuery.includes(normName);
      });

    if (!matched) {
      const available = userProfiles.map((p) => p.username).join(', ');
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            error: `Perfil "${requestedProfile}" não encontrado. Perfis disponíveis: ${available || 'nenhum'}.`,
          },
          { status: 404 }
        ),
      };
    }
    targetProfile = matched;
  }

  return {
    ok: true,
    apiKey: auth.apiKey,
    profile: targetProfile,
    user: auth.user,
  };
}
