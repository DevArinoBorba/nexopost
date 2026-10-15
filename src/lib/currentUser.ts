import { getUserByEmail, createUser, getProfiles, createProfile, type User, type Profile } from './db';

/**
 * Enquanto a autenticação própria por cookie não está ligada nas páginas,
 * garantimos um usuário/perfil padrão para ancorar contas e posts.
 * (O app hoje faz auto-login como arinoborba@gmail.com.)
 */
export function ensureDefaultUser(): { user: User; profile: Profile } {
  const email = 'arinoborba@gmail.com';
  let user = getUserByEmail(email);
  if (!user) {
    user = createUser({ email, password: 'changeme', name: 'Arino Borba' });
  }
  const profiles = getProfiles(user.id);
  const profile = profiles[0] || createProfile(user.id, 'default');
  return { user, profile };
}
