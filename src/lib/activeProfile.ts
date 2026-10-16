import { cookies } from 'next/headers';
import { ensureDefaultUser, getAuthenticatedUser, getSessionIdFromCookies } from './currentUser';
import { getProfiles, getProfileById, getProfilesWithCounts, createProfile, type Profile } from './db';

export const ACTIVE_PROFILE_COOKIE = 'active_profile';

/** Lista os perfis (clientes) do usuário autenticado, com contagem de contas. */
export function listProfiles() {
  const { user } = ensureDefaultUser();
  return getProfilesWithCounts(user.id);
}

/**
 * Perfil ativo (o "cliente" selecionado) do usuário atual.
 * Lê o cookie `active_profile`, valida se pertence ao usuário logado e cai no primeiro perfil se não houver.
 */
export function getActiveProfile(): Profile {
  const { user } = ensureDefaultUser();
  const profiles = getProfiles(user.id);

  let id: string | undefined;
  try {
    id = cookies().get(ACTIVE_PROFILE_COOKIE)?.value;
  } catch {
    id = undefined; // fora de contexto de requisição
  }

  if (id) {
    const p = getProfileById(id);
    if (p && p.user_id === user.id) return p;
  }
  return profiles[0] || createProfile(user.id, 'default');
}

export function getCurrentUser() {
  return ensureDefaultUser().user;
}

export { getAuthenticatedUser, getSessionIdFromCookies };
