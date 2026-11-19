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
 * Modo pessoal (single-user): resolve diretamente o usuário proprietário.
 */
export function getAuthenticatedUser(): User | null {
  const sessionId = getSessionIdFromCookies();
  if (sessionId) {
    const sessionUser = getUserFromSession(sessionId);
    if (sessionUser) return sessionUser;
  }
  return ensureDefaultUser().user;
}

/**
 * Garante e retorna o usuário proprietário único do NexoPost (modo pessoal).
 */
export function ensureDefaultUser(): { user: User; profile: Profile; isAuthenticated: boolean } {
  const email = process.env.OWNER_EMAIL || 'arinoborba@gmail.com';
  let user = getUserByEmail(email);
  if (!user) {
    user = createUser({
      email,
      password: 'changeme',
      name: process.env.OWNER_NAME || 'Arino Borba',
      role: 'admin',
      plan: 'personal',
    });
  }
  const profiles = getProfiles(user.id);
  const profile = profiles[0] || createProfile(user.id, 'default');
  return { user, profile, isAuthenticated: true };
}
