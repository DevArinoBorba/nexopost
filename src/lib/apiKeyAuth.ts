import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey, type Profile, type PublicApiKey, type User } from './db';

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

  return {
    ok: true,
    apiKey: auth.apiKey,
    profile: auth.profile,
    user: auth.user,
  };
}
