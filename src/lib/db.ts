import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { randomId } from './crypto';

// ============================================================
// Banco de dados próprio (SQLite) — substitui o upload-post.com
// ============================================================

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

function runMigrations(db: Database.Database) {
  // Migrações incrementais (seguras para bancos já existentes)
  const postCols = (db.prepare('PRAGMA table_info(posts)').all() as { name: string }[]).map((c) => c.name);
  if (!postCols.includes('privacy')) db.exec('ALTER TABLE posts ADD COLUMN privacy TEXT');
  if (!postCols.includes('format')) db.exec('ALTER TABLE posts ADD COLUMN format TEXT');
  if (!postCols.includes('media_paths')) db.exec('ALTER TABLE posts ADD COLUMN media_paths TEXT');

  const userCols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name);
  if (!userCols.includes('role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  if (!userCols.includes('status')) db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  if (!userCols.includes('company')) db.exec('ALTER TABLE users ADD COLUMN company TEXT');
  if (!userCols.includes('phone')) db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  if (!userCols.includes('avatar_url')) db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  if (!userCols.includes('last_login_at')) db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT');
  if (!userCols.includes('updated_at')) db.exec('ALTER TABLE users ADD COLUMN updated_at TEXT');

  // Garante que a conta principal / primeiro usuário seja admin
  db.exec(`
    UPDATE users
    SET role = 'admin'
    WHERE email = 'arinoborba@gmail.com'
       OR id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
  `);

  const sessionCols = (db.prepare('PRAGMA table_info(sessions)').all() as { name: string }[]).map((c) => c.name);
  if (!sessionCols.includes('created_at')) db.exec('ALTER TABLE sessions ADD COLUMN created_at TEXT');
  if (!sessionCols.includes('user_agent')) db.exec('ALTER TABLE sessions ADD COLUMN user_agent TEXT');
  if (!sessionCols.includes('ip_address')) db.exec('ALTER TABLE sessions ADD COLUMN ip_address TEXT');

  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_profiles (
      profile_id            TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
      company_name          TEXT NOT NULL DEFAULT '',
      niche                 TEXT NOT NULL DEFAULT '',
      location              TEXT NOT NULL DEFAULT '',
      target_audience       TEXT NOT NULL DEFAULT '',
      unique_selling_points TEXT NOT NULL DEFAULT '',
      tone                  TEXT NOT NULL DEFAULT '',
      default_cta           TEXT NOT NULL DEFAULT '',
      rules_to_avoid        TEXT NOT NULL DEFAULT '',
      updated_at            TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      key_prefix   TEXT NOT NULL,
      token_hash   TEXT UNIQUE NOT NULL,
      last_used_at TEXT,
      created_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_token ON api_keys(token_hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_profile ON api_keys(profile_id);

    CREATE TABLE IF NOT EXISTS whatsapp_links (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scope             TEXT NOT NULL DEFAULT 'user',
      profile_id        TEXT REFERENCES profiles(id) ON DELETE CASCADE,
      phone_raw         TEXT NOT NULL,
      phone_normalized  TEXT NOT NULL,
      phone_alt         TEXT,
      whatsapp_lid      TEXT,
      label             TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'pending',
      verification_code TEXT,
      code_expires_at   TEXT,
      verified_at       TEXT,
      last_used_at      TEXT,
      tokens_json       TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_links_user ON whatsapp_links(user_id);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_links_phone ON whatsapp_links(phone_normalized);
  `);
}

function init(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'media'), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      plan          TEXT NOT NULL DEFAULT 'free',
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username   TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, username)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id               TEXT PRIMARY KEY,
      profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      platform         TEXT NOT NULL,
      external_id      TEXT,
      display_name     TEXT,
      handle           TEXT,
      avatar_url       TEXT,
      access_token     TEXT,
      refresh_token    TEXT,
      token_expires_at TEXT,
      scope            TEXT,
      meta             TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      UNIQUE(profile_id, platform, external_id)
    );

    CREATE TABLE IF NOT EXISTS oauth_pending (
      state       TEXT PRIMARY KEY,
      platform    TEXT NOT NULL,
      profile_id  TEXT NOT NULL,
      code_verifier TEXT,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id             TEXT PRIMARY KEY,
      profile_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title          TEXT,
      description    TEXT,
      media_type     TEXT NOT NULL DEFAULT 'video',
      status         TEXT NOT NULL DEFAULT 'draft',
      scheduled_at   TEXT,
      timezone       TEXT,
      source_filename TEXT,
      media_path     TEXT,
      media_size     INTEGER,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_targets (
      id               TEXT PRIMARY KEY,
      post_id          TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform         TEXT NOT NULL,
      account_id       TEXT,
      status           TEXT NOT NULL DEFAULT 'pending',
      external_post_id TEXT,
      post_url         TEXT,
      error            TEXT,
      attempts         INTEGER NOT NULL DEFAULT 0,
      published_at     TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_settings (
      profile_id   TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
      timezone     TEXT NOT NULL DEFAULT 'UTC',
      slots        TEXT NOT NULL DEFAULT '[]',
      days_of_week TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
      max_per_slot INTEGER NOT NULL DEFAULT 1,
      updated_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta_sessions (
      id           TEXT PRIMARY KEY,
      user_token   TEXT NOT NULL,
      expires_at   TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autodm_rules (
      id              TEXT PRIMARY KEY,
      profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      account_id      TEXT,
      platform        TEXT NOT NULL DEFAULT 'instagram',
      name            TEXT NOT NULL,
      trigger_type    TEXT NOT NULL DEFAULT 'keyword',
      keywords        TEXT NOT NULL DEFAULT '[]',
      post_id         TEXT,
      reply_comments  TEXT NOT NULL DEFAULT '[]',
      dm_message      TEXT NOT NULL,
      delay_seconds   INTEGER NOT NULL DEFAULT 5,
      status          TEXT NOT NULL DEFAULT 'active',
      total_triggered INTEGER NOT NULL DEFAULT 0,
      total_dms_sent  INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autodm_logs (
      id                 TEXT PRIMARY KEY,
      profile_id         TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      rule_id            TEXT NOT NULL REFERENCES autodm_rules(id) ON DELETE CASCADE,
      commenter_username TEXT NOT NULL,
      comment_text       TEXT NOT NULL,
      reply_text         TEXT,
      dm_status          TEXT NOT NULL DEFAULT 'sent',
      created_at         TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profile_id);
    CREATE INDEX IF NOT EXISTS idx_posts_profile ON posts(profile_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_targets_post ON post_targets(post_id);
    CREATE INDEX IF NOT EXISTS idx_targets_status ON post_targets(status);
    CREATE INDEX IF NOT EXISTS idx_autodm_profile ON autodm_rules(profile_id);
    CREATE INDEX IF NOT EXISTS idx_autodm_logs ON autodm_logs(profile_id, created_at DESC);
  `);

  runMigrations(db);

  // Cache de statements preparados (melhora performance e evita crash de GC do better-sqlite3 no Node 24)
  const stmtCache = new Map<string, Database.Statement>();
  const rawPrepare = db.prepare.bind(db);
  db.prepare = ((source: string) => {
    let stmt = stmtCache.get(source);
    if (!stmt) {
      stmt = rawPrepare(source);
      stmtCache.set(source, stmt);
    }
    return stmt;
  }) as typeof db.prepare;

  return db;
}

// Singleton (sobrevive ao hot-reload do Next em dev)
const g = globalThis as unknown as { __appDb?: Database.Database };
export const db: Database.Database = g.__appDb ?? (g.__appDb = init());

export const now = () => new Date().toISOString();

// ============================================================
// Tipos
// ============================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  plan: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
  company?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface UserWithStats extends Omit<User, 'password_hash'> {
  profile_count: number;
  account_count: number;
  post_count: number;
  active_sessions: number;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
}

export interface Account {
  id: string;
  profile_id: string;
  platform: string;
  external_id: string | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  meta: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  profile_id: string;
  title: string | null;
  description: string | null;
  media_type: 'video' | 'photo' | 'text';
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  scheduled_at: string | null;
  timezone: string | null;
  privacy: string | null;
  format: string | null;
  media_paths: string | null;
  source_filename: string | null;
  media_path: string | null;
  media_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface PostTarget {
  id: string;
  post_id: string;
  platform: string;
  account_id: string | null;
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'skipped';
  external_post_id: string | null;
  post_url: string | null;
  error: string | null;
  attempts: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Usuários
// ============================================================

// Hash simples (scrypt) para não guardar senha em texto puro
import crypto from 'crypto';
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = stored.split(':');
    if (scheme !== 'scrypt') return false;
    const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
    return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
  } catch {
    return false;
  }
}

export function createUser(data: {
  email: string;
  password: string;
  name: string;
  plan?: string;
  role?: 'admin' | 'user';
  company?: string | null;
  phone?: string | null;
  initialProfileName?: string;
}): User {
  const ts = now();
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number })?.c || 0;
  const role: 'admin' | 'user' = data.role || (totalUsers === 0 ? 'admin' : 'user');
  const user: User = {
    id: randomId(),
    email: data.email.trim().toLowerCase(),
    password_hash: hashPassword(data.password),
    name: data.name.trim(),
    plan: data.plan || 'free',
    role,
    status: 'active',
    company: data.company?.trim() || null,
    phone: data.phone?.trim() || null,
    avatar_url: null,
    last_login_at: null,
    created_at: ts,
    updated_at: ts,
  };
  db.prepare(
    `INSERT INTO users (id,email,password_hash,name,plan,role,status,company,phone,avatar_url,last_login_at,created_at,updated_at)
     VALUES (@id,@email,@password_hash,@name,@plan,@role,@status,@company,@phone,@avatar_url,@last_login_at,@created_at,@updated_at)`
  ).run(user);
  // Cria o perfil padrão do usuário
  createProfile(user.id, data.initialProfileName?.trim() || 'default');
  return getUserById(user.id)!;
}

export function getUserByEmail(email: string): User | null {
  return (db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as User) || null;
}

export function getUserById(id: string): User | null {
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User) || null;
}

export function updateUser(
  id: string,
  data: Partial<Pick<User, 'name' | 'email' | 'plan' | 'role' | 'status' | 'company' | 'phone' | 'avatar_url' | 'last_login_at'>>
): User | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const nextEmail = data.email !== undefined ? data.email.trim().toLowerCase() : existing.email;
  const nextName = data.name !== undefined ? data.name.trim() : existing.name;
  const nextPlan = data.plan !== undefined ? data.plan : existing.plan;
  const nextRole = data.role !== undefined ? data.role : existing.role || 'user';
  const nextStatus = data.status !== undefined ? data.status : existing.status || 'active';
  const nextCompany = data.company !== undefined ? (data.company ? data.company.trim() : null) : existing.company ?? null;
  const nextPhone = data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone ?? null;
  const nextAvatar = data.avatar_url !== undefined ? data.avatar_url : existing.avatar_url ?? null;
  const nextLastLogin = data.last_login_at !== undefined ? data.last_login_at : existing.last_login_at ?? null;

  db.prepare(
    `UPDATE users SET
      email = @email,
      name = @name,
      plan = @plan,
      role = @role,
      status = @status,
      company = @company,
      phone = @phone,
      avatar_url = @avatar_url,
      last_login_at = @last_login_at,
      updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
    email: nextEmail,
    name: nextName,
    plan: nextPlan,
    role: nextRole,
    status: nextStatus,
    company: nextCompany,
    phone: nextPhone,
    avatar_url: nextAvatar,
    last_login_at: nextLastLogin,
    updated_at: now(),
  });

  return getUserById(id);
}

export function updateUserPassword(id: string, newPassword: string): void {
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(newPassword),
    now(),
    id
  );
}

export function deleteUser(id: string): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function listUsersWithStats(): UserWithStats[] {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[];
  const nowIso = now();
  return users.map((u) => {
    const profileCount =
      (db.prepare('SELECT COUNT(*) as c FROM profiles WHERE user_id = ?').get(u.id) as { c: number })?.c || 0;
    const accountCount =
      (
        db
          .prepare(
            'SELECT COUNT(*) as c FROM accounts a INNER JOIN profiles p ON a.profile_id = p.id WHERE p.user_id = ?'
          )
          .get(u.id) as { c: number }
      )?.c || 0;
    const postCount =
      (
        db
          .prepare('SELECT COUNT(*) as c FROM posts po INNER JOIN profiles p ON po.profile_id = p.id WHERE p.user_id = ?')
          .get(u.id) as { c: number }
      )?.c || 0;
    const activeSessions =
      (
        db
          .prepare('SELECT COUNT(*) as c FROM sessions WHERE user_id = ? AND expires_at > ?')
          .get(u.id, nowIso) as { c: number }
      )?.c || 0;

    const { password_hash: _pw, ...safeUser } = u;
    return {
      ...safeUser,
      role: u.role || 'user',
      status: u.status || 'active',
      profile_count: profileCount,
      account_count: accountCount,
      post_count: postCount,
      active_sessions: activeSessions,
    };
  });
}

// ============================================================
// Sessões
// ============================================================

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
}

const SESSION_DAYS = 30;

export function createSession(
  userId: string,
  meta?: { userAgent?: string | null; ipAddress?: string | null }
): Session {
  const ts = now();
  const session: Session = {
    id: randomId(),
    user_id: userId,
    expires_at: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString(),
    created_at: ts,
    user_agent: meta?.userAgent || null,
    ip_address: meta?.ipAddress || null,
  };
  db.prepare(
    'INSERT INTO sessions (id,user_id,expires_at,created_at,user_agent,ip_address) VALUES (@id,@user_id,@expires_at,@created_at,@user_agent,@ip_address)'
  ).run(session);
  updateUser(userId, { last_login_at: ts });
  return session;
}

export function getSession(sessionId: string): Session | null {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
  if (!s) return null;
  if (new Date(s.expires_at) < new Date()) {
    deleteSession(sessionId);
    return null;
  }
  return s;
}

export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function getUserSessions(userId: string): Session[] {
  const nowIso = now();
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?').run(userId, nowIso);
  return db
    .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY COALESCE(created_at, expires_at) DESC')
    .all(userId) as Session[];
}

export function deleteUserSessions(userId: string, exceptSessionId?: string): number {
  if (exceptSessionId) {
    return db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(userId, exceptSessionId).changes;
  }
  return db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes;
}

export function getUserFromSession(sessionId: string): User | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const user = getUserById(s.user_id);
  if (!user || user.status === 'suspended') return null;
  return user;
}

// ============================================================
// Perfis
// ============================================================

export function createProfile(userId: string, username: string): Profile {
  const existing = db
    .prepare('SELECT * FROM profiles WHERE user_id = ? AND username = ?')
    .get(userId, username) as Profile | undefined;
  if (existing) return existing;
  const profile: Profile = { id: randomId(), user_id: userId, username, created_at: now() };
  db.prepare('INSERT INTO profiles (id,user_id,username,created_at) VALUES (@id,@user_id,@username,@created_at)').run(
    profile
  );
  return profile;
}

export function updateProfile(id: string, username: string): Profile | null {
  db.prepare('UPDATE profiles SET username = ? WHERE id = ?').run(username.trim(), id);
  return getProfileById(id);
}

export function getProfiles(userId: string): Profile[] {
  return db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at').all(userId) as Profile[];
}

export function getProfileById(id: string): Profile | null {
  return (db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Profile) || null;
}

// ============================================================
// Contas sociais
// ============================================================

export function upsertAccount(data: Omit<Account, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Account {
  const ts = now();
  const existing = data.external_id
    ? (db
        .prepare('SELECT * FROM accounts WHERE profile_id = ? AND platform = ? AND external_id = ?')
        .get(data.profile_id, data.platform, data.external_id) as Account | undefined)
    : undefined;

  if (existing) {
    db.prepare(
      `UPDATE accounts SET display_name=@display_name, handle=@handle, avatar_url=@avatar_url,
       access_token=@access_token, refresh_token=@refresh_token, token_expires_at=@token_expires_at,
       scope=@scope, meta=@meta, updated_at=@updated_at WHERE id=@id`
    ).run({ ...data, id: existing.id, updated_at: ts });
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(existing.id) as Account;
  }

  const account: Account = { ...data, id: randomId(), created_at: ts, updated_at: ts };
  db.prepare(
    `INSERT INTO accounts (id,profile_id,platform,external_id,display_name,handle,avatar_url,access_token,
     refresh_token,token_expires_at,scope,meta,created_at,updated_at)
     VALUES (@id,@profile_id,@platform,@external_id,@display_name,@handle,@avatar_url,@access_token,
     @refresh_token,@token_expires_at,@scope,@meta,@created_at,@updated_at)`
  ).run(account);
  return account;
}

export function getAccounts(profileId: string): Account[] {
  return db.prepare('SELECT * FROM accounts WHERE profile_id = ? ORDER BY platform').all(profileId) as Account[];
}

export function getAccount(profileId: string, platform: string): Account | null {
  return (
    (db.prepare('SELECT * FROM accounts WHERE profile_id = ? AND platform = ? LIMIT 1').get(profileId, platform) as Account) ||
    null
  );
}

export function deleteAccount(profileId: string, platform: string): number {
  return db.prepare('DELETE FROM accounts WHERE profile_id = ? AND platform = ?').run(profileId, platform).changes;
}

export function updateAccountTokens(
  id: string,
  tokens: { access_token: string; refresh_token?: string | null; token_expires_at?: string | null; scope?: string | null }
): void {
  db.prepare(
    `UPDATE accounts SET access_token = @access_token,
       refresh_token = COALESCE(@refresh_token, refresh_token),
       token_expires_at = @token_expires_at,
       scope = COALESCE(@scope, scope),
       updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expires_at: tokens.token_expires_at ?? null,
    scope: tokens.scope ?? null,
    updated_at: now(),
  });
}

// ============================================================
// OAuth pendente
// ============================================================

export function savePendingOAuth(state: string, platform: string, profileId: string, codeVerifier?: string): void {
  db.prepare(
    'INSERT OR REPLACE INTO oauth_pending (state,platform,profile_id,code_verifier,created_at) VALUES (?,?,?,?,?)'
  ).run(state, platform, profileId, codeVerifier || null, now());
}

export function takePendingOAuth(state: string): { platform: string; profile_id: string; code_verifier: string | null } | null {
  const row = db.prepare('SELECT * FROM oauth_pending WHERE state = ?').get(state) as
    | { platform: string; profile_id: string; code_verifier: string | null }
    | undefined;
  if (row) db.prepare('DELETE FROM oauth_pending WHERE state = ?').run(state);
  return row || null;
}

// ============================================================
// Posts
// ============================================================

export function createPost(data: {
  profile_id: string;
  title?: string;
  description?: string;
  media_type?: Post['media_type'];
  status?: Post['status'];
  scheduled_at?: string | null;
  timezone?: string | null;
  privacy?: string | null;
  format?: string | null;
  media_paths?: string[] | null;
  source_filename?: string | null;
  media_path?: string | null;
  media_size?: number | null;
}): Post {
  const ts = now();
  const post: Post = {
    id: randomId(),
    profile_id: data.profile_id,
    title: data.title ?? null,
    description: data.description ?? null,
    media_type: data.media_type ?? 'video',
    status: data.status ?? 'draft',
    scheduled_at: data.scheduled_at ?? null,
    timezone: data.timezone ?? null,
    privacy: data.privacy ?? null,
    format: data.format ?? null,
    media_paths: data.media_paths ? JSON.stringify(data.media_paths) : null,
    source_filename: data.source_filename ?? null,
    media_path: data.media_path ?? null,
    media_size: data.media_size ?? null,
    created_at: ts,
    updated_at: ts,
  };
  db.prepare(
    `INSERT INTO posts (id,profile_id,title,description,media_type,status,scheduled_at,timezone,privacy,format,
     media_paths,source_filename,media_path,media_size,created_at,updated_at)
     VALUES (@id,@profile_id,@title,@description,@media_type,@status,@scheduled_at,@timezone,@privacy,@format,
     @media_paths,@source_filename,@media_path,@media_size,@created_at,@updated_at)`
  ).run(post);
  return post;
}

export function getPost(id: string): Post | null {
  return (db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Post) || null;
}

export function getPosts(profileId: string, limit = 50): Post[] {
  return db
    .prepare('SELECT * FROM posts WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(profileId, limit) as Post[];
}

export function updatePost(id: string, data: Partial<Post>): void {
  const fields = Object.keys(data)
    .filter((k) => k !== 'id' && k !== 'created_at')
    .map((k) => `${k} = @${k}`)
    .join(', ');
  db.prepare(`UPDATE posts SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
    ...data,
    id,
    updated_at: now(),
  });
}

export function deletePost(id: string): void {
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

// ============================================================
// Destinos (uma linha por plataforma de um post)
// ============================================================

export function createTarget(data: {
  post_id: string;
  platform: string;
  account_id?: string | null;
  status?: PostTarget['status'];
}): PostTarget {
  const ts = now();
  const target: PostTarget = {
    id: randomId(),
    post_id: data.post_id,
    platform: data.platform,
    account_id: data.account_id ?? null,
    status: data.status ?? 'pending',
    external_post_id: null,
    post_url: null,
    error: null,
    attempts: 0,
    published_at: null,
    created_at: ts,
    updated_at: ts,
  };
  db.prepare(
    `INSERT INTO post_targets (id,post_id,platform,account_id,status,external_post_id,post_url,error,attempts,published_at,created_at,updated_at)
     VALUES (@id,@post_id,@platform,@account_id,@status,@external_post_id,@post_url,@error,@attempts,@published_at,@created_at,@updated_at)`
  ).run(target);
  return target;
}

export function getTargets(postId: string): PostTarget[] {
  return db.prepare('SELECT * FROM post_targets WHERE post_id = ? ORDER BY platform').all(postId) as PostTarget[];
}

export function updateTarget(id: string, data: Partial<PostTarget>): void {
  const fields = Object.keys(data)
    .filter((k) => k !== 'id' && k !== 'created_at')
    .map((k) => `${k} = @${k}`)
    .join(', ');
  db.prepare(`UPDATE post_targets SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({
    ...data,
    id,
    updated_at: now(),
  });
}

export function getPendingTargets(): PostTarget[] {
  return db
    .prepare("SELECT * FROM post_targets WHERE status IN ('pending','publishing') ORDER BY created_at")
    .all() as PostTarget[];
}

// ============================================================
// Fila (queue)
// ============================================================

export interface QueueSettings {
  profile_id: string;
  timezone: string;
  slots: { hour: number; minute: number }[];
  days_of_week: number[];
  max_per_slot: number;
}

export function getQueueSettings(profileId: string): QueueSettings {
  const row = db.prepare('SELECT * FROM queue_settings WHERE profile_id = ?').get(profileId) as
    | { profile_id: string; timezone: string; slots: string; days_of_week: string; max_per_slot: number }
    | undefined;
  if (!row) return { profile_id: profileId, timezone: 'UTC', slots: [], days_of_week: [0, 1, 2, 3, 4, 5, 6], max_per_slot: 1 };
  return {
    profile_id: row.profile_id,
    timezone: row.timezone,
    slots: JSON.parse(row.slots),
    days_of_week: JSON.parse(row.days_of_week),
    max_per_slot: row.max_per_slot,
  };
}

export function setQueueSettings(data: QueueSettings): void {
  db.prepare(
    `INSERT INTO queue_settings (profile_id,timezone,slots,days_of_week,max_per_slot,updated_at)
     VALUES (@profile_id,@timezone,@slots,@days_of_week,@max_per_slot,@updated_at)
     ON CONFLICT(profile_id) DO UPDATE SET timezone=@timezone, slots=@slots, days_of_week=@days_of_week,
     max_per_slot=@max_per_slot, updated_at=@updated_at`
  ).run({
    profile_id: data.profile_id,
    timezone: data.timezone,
    slots: JSON.stringify(data.slots),
    days_of_week: JSON.stringify(data.days_of_week),
    max_per_slot: data.max_per_slot,
    updated_at: now(),
  });
}

// ============================================================
// Configurações gerais
// ============================================================

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=?, updated_at=?'
  ).run(key, value, now(), value, now());
}

export const DATA_PATH = DATA_DIR;

// ============================================================
// Sessões Meta (autorização temporária para escolher Páginas)
// ============================================================

export function createMetaSession(encryptedToken: string): string {
  const id = randomId();
  db.prepare('INSERT INTO meta_sessions (id,user_token,expires_at,created_at) VALUES (?,?,?,?)').run(
    id,
    encryptedToken,
    new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h
    now()
  );
  return id;
}

export function getMetaSession(id: string): string | null {
  const row = db.prepare('SELECT * FROM meta_sessions WHERE id = ?').get(id) as
    | { user_token: string; expires_at: string }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    deleteMetaSession(id);
    return null;
  }
  return row.user_token;
}

export function deleteMetaSession(id: string): void {
  db.prepare('DELETE FROM meta_sessions WHERE id = ?').run(id);
}

// ============================================================
// Perfis (clientes) — contagem de contas
// ============================================================

export function getProfilesWithCounts(userId: string): (Profile & { account_count: number; platforms: string[] })[] {
  const profiles = getProfiles(userId);
  return profiles.map((p) => {
    const rows = db.prepare('SELECT platform FROM accounts WHERE profile_id = ?').all(p.id) as { platform: string }[];
    return { ...p, account_count: rows.length, platforms: rows.map((r) => r.platform) };
  });
}

export function deleteProfile(id: string): void {
  db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
}

// ============================================================
// AutoDM (Automação de Comentários e Mensagens Diretas)
// ============================================================

export interface AutoDMRule {
  id: string;
  profile_id: string;
  account_id: string | null;
  platform: string;
  name: string;
  trigger_type: 'keyword' | 'any_comment' | 'story_mention';
  keywords: string[];
  post_id: string | null;
  reply_comments: string[];
  dm_message: string;
  delay_seconds: number;
  status: 'active' | 'paused';
  total_triggered: number;
  total_dms_sent: number;
  created_at: string;
  updated_at: string;
}

export interface AutoDMLog {
  id: string;
  profile_id: string;
  rule_id: string;
  rule_name?: string;
  commenter_username: string;
  comment_text: string;
  reply_text: string | null;
  dm_status: 'sent' | 'simulated' | 'failed';
  created_at: string;
}

export function getAutoDMRules(profileId: string): AutoDMRule[] {
  seedAutoDMDefaultsIfEmpty(profileId);
  const rows = db
    .prepare('SELECT * FROM autodm_rules WHERE profile_id = ? ORDER BY created_at DESC')
    .all(profileId) as any[];

  return rows.map((r) => ({
    ...r,
    keywords: JSON.parse(r.keywords || '[]'),
    reply_comments: JSON.parse(r.reply_comments || '[]'),
  }));
}

export function getAutoDMRule(id: string): AutoDMRule | null {
  const r = db.prepare('SELECT * FROM autodm_rules WHERE id = ?').get(id) as any | undefined;
  if (!r) return null;
  return {
    ...r,
    keywords: JSON.parse(r.keywords || '[]'),
    reply_comments: JSON.parse(r.reply_comments || '[]'),
  };
}

export function createAutoDMRule(data: {
  profile_id: string;
  account_id?: string | null;
  platform?: string;
  name: string;
  trigger_type?: 'keyword' | 'any_comment' | 'story_mention';
  keywords: string[];
  post_id?: string | null;
  reply_comments: string[];
  dm_message: string;
  delay_seconds?: number;
  status?: 'active' | 'paused';
}): AutoDMRule {
  const id = randomId();
  const rule: AutoDMRule = {
    id,
    profile_id: data.profile_id,
    account_id: data.account_id || null,
    platform: data.platform || 'instagram',
    name: data.name,
    trigger_type: data.trigger_type || 'keyword',
    keywords: data.keywords,
    post_id: data.post_id || null,
    reply_comments: data.reply_comments,
    dm_message: data.dm_message,
    delay_seconds: data.delay_seconds ?? 5,
    status: data.status || 'active',
    total_triggered: 0,
    total_dms_sent: 0,
    created_at: now(),
    updated_at: now(),
  };

  db.prepare(`
    INSERT INTO autodm_rules (
      id, profile_id, account_id, platform, name, trigger_type, keywords,
      post_id, reply_comments, dm_message, delay_seconds, status,
      total_triggered, total_dms_sent, created_at, updated_at
    ) VALUES (
      @id, @profile_id, @account_id, @platform, @name, @trigger_type, @keywords,
      @post_id, @reply_comments, @dm_message, @delay_seconds, @status,
      @total_triggered, @total_dms_sent, @created_at, @updated_at
    )
  `).run({
    ...rule,
    keywords: JSON.stringify(rule.keywords),
    reply_comments: JSON.stringify(rule.reply_comments),
  });

  return rule;
}

export function updateAutoDMRule(id: string, data: Partial<AutoDMRule>): AutoDMRule | null {
  const current = getAutoDMRule(id);
  if (!current) return null;

  const updated: AutoDMRule = {
    ...current,
    ...data,
    updated_at: now(),
  };

  db.prepare(`
    UPDATE autodm_rules SET
      name = @name,
      platform = @platform,
      account_id = @account_id,
      trigger_type = @trigger_type,
      keywords = @keywords,
      post_id = @post_id,
      reply_comments = @reply_comments,
      dm_message = @dm_message,
      delay_seconds = @delay_seconds,
      status = @status,
      total_triggered = @total_triggered,
      total_dms_sent = @total_dms_sent,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    ...updated,
    keywords: JSON.stringify(updated.keywords),
    reply_comments: JSON.stringify(updated.reply_comments),
  });

  return updated;
}

export function deleteAutoDMRule(id: string): void {
  db.prepare('DELETE FROM autodm_rules WHERE id = ?').run(id);
}

export function toggleAutoDMRule(id: string): AutoDMRule | null {
  const current = getAutoDMRule(id);
  if (!current) return null;
  const newStatus = current.status === 'active' ? 'paused' : 'active';
  return updateAutoDMRule(id, { status: newStatus });
}

export function getAutoDMLogs(profileId: string, limit = 50): AutoDMLog[] {
  return db
    .prepare(`
      SELECT l.*, r.name as rule_name
      FROM autodm_logs l
      LEFT JOIN autodm_rules r ON l.rule_id = r.id
      WHERE l.profile_id = ?
      ORDER BY l.created_at DESC
      LIMIT ?
    `)
    .all(profileId, limit) as AutoDMLog[];
}

export function createAutoDMLog(data: {
  profile_id: string;
  rule_id: string;
  commenter_username: string;
  comment_text: string;
  reply_text?: string | null;
  dm_status?: 'sent' | 'simulated' | 'failed';
}): AutoDMLog {
  const id = randomId();
  const log: AutoDMLog = {
    id,
    profile_id: data.profile_id,
    rule_id: data.rule_id,
    commenter_username: data.commenter_username,
    comment_text: data.comment_text,
    reply_text: data.reply_text || null,
    dm_status: data.dm_status || 'sent',
    created_at: now(),
  };

  db.prepare(`
    INSERT INTO autodm_logs (
      id, profile_id, rule_id, commenter_username, comment_text, reply_text, dm_status, created_at
    ) VALUES (
      @id, @profile_id, @rule_id, @commenter_username, @comment_text, @reply_text, @dm_status, @created_at
    )
  `).run(log);

  // Incrementar contadores da regra
  db.prepare(`
    UPDATE autodm_rules
    SET total_triggered = total_triggered + 1,
        total_dms_sent = total_dms_sent + 1,
        updated_at = ?
    WHERE id = ?
  `).run(now(), data.rule_id);

  return log;
}

export function seedAutoDMDefaultsIfEmpty(profileId: string) {
  try {
    const count = (db.prepare('SELECT COUNT(*) as c FROM autodm_rules WHERE profile_id = ?').get(profileId) as any)?.c || 0;
    if (count > 0) return;

    createAutoDMRule({
      profile_id: profileId,
      name: 'Disparo de Link Exclusivo ("QUERO" / "LINK")',
      platform: 'instagram',
      trigger_type: 'keyword',
      keywords: ['quero', 'link', 'envia', 'eu quero', 'manda'],
      reply_comments: [
        'Acabei de te enviar no direct com todos os detalhes! 🚀 Dá uma olhada lá!',
        'Link enviado com sucesso no seu direct! Confere aí! ✨',
        'Te mandei uma mensagem no privado! Corre lá pra ver 📥'
      ],
      dm_message: 'Olá {nome}! Tudo bem?\n\nConforme prometido, aqui está o seu link de acesso exclusivo:\n👉 https://nexopost.com/acesso-vip\n\nSe tiver qualquer dúvida, é só me responder por aqui!\nBoas postagens! 🎯',
      delay_seconds: 5,
      status: 'active',
    });

    createAutoDMRule({
      profile_id: profileId,
      name: 'Atendimento Rápido para Preço e Informações',
      platform: 'instagram',
      trigger_type: 'keyword',
      keywords: ['preco', 'preço', 'valor', 'quanto custa', 'info'],
      reply_comments: [
        'Te passei os valores e condições especiais no direct! 💬',
        'Dá uma checada nas suas mensagens, enviei todas as informações por lá! ✅'
      ],
      dm_message: 'Oi {nome}!\n\nAqui estão as informações completas e tabela especial com as opções disponíveis:\n\n• Plano Creator: R$ 49/mês\n• Plano Agência: R$ 149/mês\n\nQual deles se encaixa melhor no seu momento? Se quiser, posso agendar uma demonstração rápida!',
      delay_seconds: 10,
      status: 'active',
    });
  } catch {
    // se banco não inicializado ainda, ignora
  }
}

// ============================================================
// Cérebro da Marca (Brand Context) vinculado aos Perfis
// ============================================================

export interface BrandProfile {
  profile_id: string;
  company_name: string;
  niche: string;
  location: string;
  target_audience: string;
  unique_selling_points: string;
  tone: string;
  default_cta: string;
  rules_to_avoid: string;
  updated_at: string;
}

export function getBrandProfile(profileId: string): BrandProfile {
  const row = db
    .prepare('SELECT * FROM brand_profiles WHERE profile_id = ?')
    .get(profileId) as BrandProfile | undefined;

  if (row) return row;

  return {
    profile_id: profileId,
    company_name: '',
    niche: '',
    location: '',
    target_audience: '',
    unique_selling_points: '',
    tone: '',
    default_cta: '',
    rules_to_avoid: '',
    updated_at: '',
  };
}

export function upsertBrandProfile(data: {
  profile_id: string;
  company_name?: string;
  niche?: string;
  location?: string;
  target_audience?: string;
  unique_selling_points?: string;
  tone?: string;
  default_cta?: string;
  rules_to_avoid?: string;
}): BrandProfile {
  const current = getBrandProfile(data.profile_id);
  const updated: BrandProfile = {
    profile_id: data.profile_id,
    company_name: (data.company_name ?? current.company_name).trim(),
    niche: (data.niche ?? current.niche).trim(),
    location: (data.location ?? current.location).trim(),
    target_audience: (data.target_audience ?? current.target_audience).trim(),
    unique_selling_points: (data.unique_selling_points ?? current.unique_selling_points).trim(),
    tone: (data.tone ?? current.tone).trim(),
    default_cta: (data.default_cta ?? current.default_cta).trim(),
    rules_to_avoid: (data.rules_to_avoid ?? current.rules_to_avoid).trim(),
    updated_at: now(),
  };

  db.prepare(
    `
    INSERT INTO brand_profiles (
      profile_id, company_name, niche, location, target_audience,
      unique_selling_points, tone, default_cta, rules_to_avoid, updated_at
    ) VALUES (
      @profile_id, @company_name, @niche, @location, @target_audience,
      @unique_selling_points, @tone, @default_cta, @rules_to_avoid, @updated_at
    )
    ON CONFLICT(profile_id) DO UPDATE SET
      company_name          = excluded.company_name,
      niche                 = excluded.niche,
      location              = excluded.location,
      target_audience       = excluded.target_audience,
      unique_selling_points = excluded.unique_selling_points,
      tone                  = excluded.tone,
      default_cta           = excluded.default_cta,
      rules_to_avoid        = excluded.rules_to_avoid,
      updated_at            = excluded.updated_at
  `
  ).run(updated);

  return updated;
}

// ============================================================
// Chaves de API (API Keys — Integração Hermes & SaaS v1)
// ============================================================

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  profile_id: string;
  profile_name?: string;
  name: string;
  key_prefix: string;
  token_hash: string;
  last_used_at: string | null;
  created_at: string;
}

export type PublicApiKey = Omit<ApiKeyRecord, 'token_hash'>;

export function hashApiKey(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function createApiKey(data: {
  user_id: string;
  profile_id: string;
  name: string;
}): { apiKey: PublicApiKey; rawToken: string } {
  const rawToken = `nex_live_${crypto.randomBytes(24).toString('base64url')}`;
  const tokenHash = hashApiKey(rawToken);
  const keyPrefix = `${rawToken.slice(0, 15)}...${rawToken.slice(-4)}`;
  const ts = now();
  const id = randomId();

  db.prepare(
    `INSERT INTO api_keys (id, user_id, profile_id, name, key_prefix, token_hash, last_used_at, created_at)
     VALUES (@id, @user_id, @profile_id, @name, @key_prefix, @token_hash, NULL, @created_at)`
  ).run({
    id,
    user_id: data.user_id,
    profile_id: data.profile_id,
    name: data.name.trim() || 'Chave de API',
    key_prefix: keyPrefix,
    token_hash: tokenHash,
    created_at: ts,
  });

  const profile = getProfileById(data.profile_id);
  return {
    apiKey: {
      id,
      user_id: data.user_id,
      profile_id: data.profile_id,
      profile_name: profile?.username || 'default',
      name: data.name.trim() || 'Chave de API',
      key_prefix: keyPrefix,
      last_used_at: null,
      created_at: ts,
    },
    rawToken,
  };
}

export function listApiKeys(userId: string, profileId?: string): PublicApiKey[] {
  const rows = profileId
    ? (db
        .prepare(
          `SELECT k.id, k.user_id, k.profile_id, p.username as profile_name, k.name, k.key_prefix, k.last_used_at, k.created_at
           FROM api_keys k
           LEFT JOIN profiles p ON p.id = k.profile_id
           WHERE k.user_id = ? AND k.profile_id = ?
           ORDER BY k.created_at DESC`
        )
        .all(userId, profileId) as PublicApiKey[])
    : (db
        .prepare(
          `SELECT k.id, k.user_id, k.profile_id, p.username as profile_name, k.name, k.key_prefix, k.last_used_at, k.created_at
           FROM api_keys k
           LEFT JOIN profiles p ON p.id = k.profile_id
           WHERE k.user_id = ?
           ORDER BY k.created_at DESC`
        )
        .all(userId) as PublicApiKey[]);

  return rows;
}

export function revokeApiKey(id: string, userId: string): boolean {
  const res = db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(id, userId);
  return res.changes > 0;
}

export function authenticateApiKey(rawToken: string): {
  apiKey: PublicApiKey;
  profile: Profile;
  user: User;
} | null {
  const trimmed = rawToken.trim();
  if (!trimmed.startsWith('nex_')) return null;

  const tokenHash = hashApiKey(trimmed);
  const record = db
    .prepare('SELECT * FROM api_keys WHERE token_hash = ?')
    .get(tokenHash) as ApiKeyRecord | undefined;

  if (!record) return null;

  const user = getUserById(record.user_id);
  if (!user || user.status === 'suspended') return null;

  const profile = getProfileById(record.profile_id);
  if (!profile) return null;

  const usedAt = now();
  db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(usedAt, record.id);

  const { token_hash: _hash, ...publicKey } = record;
  return {
    apiKey: { ...publicKey, profile_name: profile.username, last_used_at: usedAt },
    profile,
    user,
  };
}

// ============================================================
// Vínculo e Verificação de WhatsApp (Integração Direta Hermes)
// ============================================================

export interface WhatsAppLinkRecord {
  id: string;
  user_id: string;
  scope: 'user' | 'profile';
  profile_id: string | null;
  profile_name?: string | null;
  phone_raw: string;
  phone_normalized: string;
  phone_alt: string | null;
  whatsapp_lid: string | null;
  label: string;
  status: 'pending' | 'verified';
  verification_code: string | null;
  code_expires_at: string | null;
  verified_at: string | null;
  last_used_at: string | null;
  tokens_json: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicWhatsAppLink = Omit<WhatsAppLinkRecord, 'verification_code' | 'tokens_json'> & {
  allowed_profiles: { id: string; username: string; platforms: string[] }[];
};

export function normalizePhoneVariants(input: string): { primary: string; alt: string | null } {
  let digits = String(input || '').replace(/\D+/g, '');
  if (!digits) return { primary: '', alt: null };

  // Se digitou DDD + número sem DDI 55 (10 ou 11 dígitos no Brasil)
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }

  let alt: string | null = null;
  // Números do Brasil (55 + 2 dígitos DDD + 8 ou 9 dígitos)
  if (digits.startsWith('55')) {
    const rest = digits.slice(4); // após 55 + DDD
    const ddd = digits.slice(2, 4);
    if (rest.length === 9 && rest.startsWith('9')) {
      alt = `55${ddd}${rest.slice(1)}`; // versão de 8 dígitos usada pelo WhatsApp em vários DDDs
    } else if (rest.length === 8) {
      alt = `55${ddd}9${rest}`; // versão de 9 dígitos
    }
  }

  return { primary: digits, alt };
}

export function createOrUpdatePendingWhatsAppLink(data: {
  user_id: string;
  scope: 'user' | 'profile';
  profile_id?: string | null;
  phone: string;
  label?: string;
}): { link: PublicWhatsAppLink; code: string } {
  const { primary, alt } = normalizePhoneVariants(data.phone);
  if (primary.length < 10) {
    throw new Error('Informe um número de WhatsApp válido com DDD (ex: 5567981108176).');
  }

  const scope: 'user' | 'profile' = data.scope === 'profile' && data.profile_id ? 'profile' : 'user';
  const profileId = scope === 'profile' ? data.profile_id || null : null;
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const ts = now();

  const existing = db
    .prepare('SELECT * FROM whatsapp_links WHERE user_id = ? AND phone_normalized = ?')
    .get(data.user_id, primary) as WhatsAppLinkRecord | undefined;

  const label =
    data.label?.trim() ||
    (scope === 'profile' && profileId
      ? `WhatsApp (${getProfileById(profileId)?.username || 'Perfil'})`
      : 'WhatsApp da Conta');

  let id = existing?.id || randomId();
  if (existing) {
    db.prepare(
      `UPDATE whatsapp_links SET
        scope = @scope,
        profile_id = @profile_id,
        phone_raw = @phone_raw,
        phone_normalized = @phone_normalized,
        phone_alt = @phone_alt,
        label = @label,
        status = 'pending',
        verification_code = @verification_code,
        code_expires_at = @code_expires_at,
        updated_at = @updated_at
       WHERE id = @id`
    ).run({
      id,
      scope,
      profile_id: profileId,
      phone_raw: data.phone.trim(),
      phone_normalized: primary,
      phone_alt: alt,
      label,
      verification_code: code,
      code_expires_at: expiresAt,
      updated_at: ts,
    });
  } else {
    db.prepare(
      `INSERT INTO whatsapp_links (
        id, user_id, scope, profile_id, phone_raw, phone_normalized, phone_alt,
        whatsapp_lid, label, status, verification_code, code_expires_at,
        verified_at, last_used_at, tokens_json, created_at, updated_at
      ) VALUES (
        @id, @user_id, @scope, @profile_id, @phone_raw, @phone_normalized, @phone_alt,
        NULL, @label, 'pending', @verification_code, @code_expires_at,
        NULL, NULL, NULL, @created_at, @updated_at
      )`
    ).run({
      id,
      user_id: data.user_id,
      scope,
      profile_id: profileId,
      phone_raw: data.phone.trim(),
      phone_normalized: primary,
      phone_alt: alt,
      label,
      verification_code: code,
      code_expires_at: expiresAt,
      created_at: ts,
      updated_at: ts,
    });
  }

  const link = listWhatsAppLinks(data.user_id).find((l) => l.id === id)!;
  return { link, code };
}

export function setWhatsAppLinkLid(id: string, lid: string | null): void {
  if (!lid) return;
  db.prepare('UPDATE whatsapp_links SET whatsapp_lid = ?, updated_at = ? WHERE id = ?').run(lid, now(), id);
}

export function verifyWhatsAppLinkCode(
  userId: string,
  linkId: string,
  codeInput: string
): PublicWhatsAppLink {
  const row = db
    .prepare('SELECT * FROM whatsapp_links WHERE id = ? AND user_id = ?')
    .get(linkId, userId) as WhatsAppLinkRecord | undefined;

  if (!row) {
    throw new Error('Solicitação de vínculo não encontrada.');
  }

  const cleanCode = String(codeInput || '').replace(/\D+/g, '');
  if (!row.verification_code || row.verification_code !== cleanCode) {
    throw new Error('Código de verificação incorreto.');
  }

  if (row.code_expires_at && new Date(row.code_expires_at) < new Date()) {
    throw new Error('O código expirou. Solicite um novo código.');
  }

  // Gerar chaves de API exclusivas para os perfis permitidos por este vínculo
  const targetProfiles =
    row.scope === 'profile' && row.profile_id
      ? [getProfileById(row.profile_id)].filter(Boolean) as Profile[]
      : getProfiles(userId);

  const tokensMap: Record<string, { profile_id: string; profile_name: string; api_key: string }> = {};
  for (const prof of targetProfiles) {
    const keyName = `Hermes WhatsApp (${row.phone_normalized}) - ${prof.username}`;
    // Remove chave anterior do mesmo WhatsApp + perfil para não acumular
    db.prepare('DELETE FROM api_keys WHERE user_id = ? AND profile_id = ? AND name = ?').run(
      userId,
      prof.id,
      keyName
    );
    const created = createApiKey({
      user_id: userId,
      profile_id: prof.id,
      name: keyName,
    });
    tokensMap[prof.id] = {
      profile_id: prof.id,
      profile_name: prof.username,
      api_key: created.rawToken,
    };
  }

  const ts = now();
  db.prepare(
    `UPDATE whatsapp_links SET
      status = 'verified',
      verification_code = NULL,
      code_expires_at = NULL,
      verified_at = @verified_at,
      tokens_json = @tokens_json,
      updated_at = @updated_at
     WHERE id = @id`
  ).run({
    id: row.id,
    verified_at: ts,
    tokens_json: JSON.stringify(tokensMap),
    updated_at: ts,
  });

  syncHermesWhatsAppPermissionsFile();
  return listWhatsAppLinks(userId).find((l) => l.id === row.id)!;
}

export function deleteWhatsAppLink(id: string, userId: string): boolean {
  const row = db
    .prepare('SELECT * FROM whatsapp_links WHERE id = ? AND user_id = ?')
    .get(id, userId) as WhatsAppLinkRecord | undefined;
  if (!row) return false;

  // Revogar também as API keys criadas para este vínculo de WhatsApp
  const prefix = `Hermes WhatsApp (${row.phone_normalized})%`;
  db.prepare('DELETE FROM api_keys WHERE user_id = ? AND name LIKE ?').run(userId, prefix);

  const res = db.prepare('DELETE FROM whatsapp_links WHERE id = ? AND user_id = ?').run(id, userId);
  syncHermesWhatsAppPermissionsFile();
  return res.changes > 0;
}

export function listWhatsAppLinks(userId: string): PublicWhatsAppLink[] {
  const rows = db
    .prepare(
      `SELECT l.*, p.username as profile_name
       FROM whatsapp_links l
       LEFT JOIN profiles p ON p.id = l.profile_id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC`
    )
    .all(userId) as WhatsAppLinkRecord[];

  const userProfiles = getProfilesWithCounts(userId);

  return rows.map((r) => {
    const allowed =
      r.scope === 'profile' && r.profile_id
        ? userProfiles.filter((p) => p.id === r.profile_id)
        : userProfiles;

    const { verification_code: _vc, tokens_json: _tj, ...pub } = r;
    return {
      ...pub,
      allowed_profiles: allowed.map((p) => ({
        id: p.id,
        username: p.username,
        platforms: p.platforms,
      })),
    };
  });
}

export function syncHermesWhatsAppPermissionsFile(): void {
  try {
    const verifiedRows = db
      .prepare("SELECT * FROM whatsapp_links WHERE status = 'verified'")
      .all() as WhatsAppLinkRecord[];

    const links = verifiedRows.map((r) => {
      const user = getUserById(r.user_id);
      const userProfiles = getProfilesWithCounts(r.user_id);
      const allowedProfiles =
        r.scope === 'profile' && r.profile_id
          ? userProfiles.filter((p) => p.id === r.profile_id)
          : userProfiles;

      let tokensMap: Record<string, { profile_id: string; profile_name: string; api_key: string }> = {};
      try {
        tokensMap = r.tokens_json ? JSON.parse(r.tokens_json) : {};
      } catch {
        tokensMap = {};
      }

      // Se o usuário criou algum perfil novo depois de verificar o WhatsApp (quando scope === 'user'), gera chave automaticamente
      let updatedTokens = false;
      for (const prof of allowedProfiles) {
        if (!tokensMap[prof.id]?.api_key) {
          const keyName = `Hermes WhatsApp (${r.phone_normalized}) - ${prof.username}`;
          db.prepare('DELETE FROM api_keys WHERE user_id = ? AND profile_id = ? AND name = ?').run(
            r.user_id,
            prof.id,
            keyName
          );
          const created = createApiKey({
            user_id: r.user_id,
            profile_id: prof.id,
            name: keyName,
          });
          tokensMap[prof.id] = {
            profile_id: prof.id,
            profile_name: prof.username,
            api_key: created.rawToken,
          };
          updatedTokens = true;
        }
      }
      if (updatedTokens) {
        db.prepare('UPDATE whatsapp_links SET tokens_json = ? WHERE id = ?').run(
          JSON.stringify(tokensMap),
          r.id
        );
      }

      return {
        link_id: r.id,
        user_id: r.user_id,
        user_name: user?.name || '',
        user_email: user?.email || '',
        scope: r.scope,
        phone_normalized: r.phone_normalized,
        phone_alt: r.phone_alt,
        whatsapp_lid: r.whatsapp_lid,
        verified_at: r.verified_at,
        profiles: allowedProfiles.map((p) => ({
          profile_id: p.id,
          profile_name: p.username,
          platforms: p.platforms,
          api_key: tokensMap[p.id]?.api_key || '',
        })),
      };
    });

    const outPath = path.join(DATA_DIR, 'hermes_whatsapp_permissions.json');
    fs.writeFileSync(
      outPath,
      JSON.stringify({ updated_at: now(), verified_links: links }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Erro ao sincronizar hermes_whatsapp_permissions.json:', err);
  }
}




