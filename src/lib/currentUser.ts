import { cookies } from 'next/headers';
import {
  getUserByEmail,
  createUser,
  getProfiles,
  createProfile,
  getUserFromSession,
  type User,
  type Profile,
} from './db';

export const SESSION_COOKIE = 'session';

export function getSessionIdFromCookies(): string | null {
  try {
    return cookies().get(SESSION_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Retorna o usuário autenticado pela sessão real (cookie HttpOnly `session`),
 * ou `null` quando não há sessão válida.
 */
export function getAuthenticatedUser(): User | null {
  const sessionId = getSessionIdFromCookies();
  if (!sessionId) return null;
  return getUserFromSession(sessionId);
}

/**
 * Resolve o usuário atual a partir do cookie de sessão real (`session`).
 * Caso seja chamado fora de sessão (ex.: primeiro boot local ou cron),
 * garante o usuário proprietário padrão para que rotinas internas não quebrem.
 */
export function ensureDefaultUser(): { user: User; profile: Profile; isAuthenticated: boolean } {
  const sessionUser = getAuthenticatedUser();
  if (sessionUser) {
    const profiles = getProfiles(sessionUser.id);
    const profile = profiles[0] || createProfile(sessionUser.id, 'default');
    return { user: sessionUser, profile, isAuthenticated: true };
  }

  const email = 'arinoborba@gmail.com';
  let user = getUserByEmail(email);
  if (!user) {
    user = createUser({ email, password: 'changeme', name: 'Arino Borba', role: 'admin', plan: 'agency' });
  }
  const profiles = getProfiles(user.id);
  const profile = profiles[0] || createProfile(user.id, 'default');
  return { user, profile, isAuthenticated: false };
}
