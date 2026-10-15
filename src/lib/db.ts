import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { randomId } from './crypto';

// ============================================================
// Banco de dados próprio (SQLite) — substitui o upload-post.com
// ============================================================

const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

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

    CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profile_id);
    CREATE INDEX IF NOT EXISTS idx_posts_profile ON posts(profile_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_targets_post ON post_targets(post_id);
    CREATE INDEX IF NOT EXISTS idx_targets_status ON post_targets(status);
  `);

  // Migrações incrementais (seguras para bancos já existentes)
  const postCols = (db.prepare('PRAGMA table_info(posts)').all() as { name: string }[]).map((c) => c.name);
  if (!postCols.includes('privacy')) db.exec('ALTER TABLE posts ADD COLUMN privacy TEXT');
  if (!postCols.includes('format')) db.exec('ALTER TABLE posts ADD COLUMN format TEXT');
  if (!postCols.includes('media_paths')) db.exec('ALTER TABLE posts ADD COLUMN media_paths TEXT');

  return db;
}

// Singleton (sobrevive ao hot-reload do Next em dev)
const g = globalThis as unknown as { __appDb?: Database.Database };
export const db: Database.Database = g.__appDb ?? init();
if (process.env.NODE_ENV !== 'production') g.__appDb = db;

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
  created_at: string;
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

export function createUser(data: { email: string; password: string; name: string }): User {
  const user: User = {
    id: randomId(),
    email: data.email.toLowerCase(),
    password_hash: hashPassword(data.password),
    name: data.name,
    plan: 'free',
    created_at: now(),
  };
  db.prepare(
    `INSERT INTO users (id,email,password_hash,name,plan,created_at) VALUES (@id,@email,@password_hash,@name,@plan,@created_at)`
  ).run(user);
  // Cria o perfil padrão
  createProfile(user.id, 'default');
  return user;
}

export function getUserByEmail(email: string): User | null {
  return (db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as User) || null;
}

export function getUserById(id: string): User | null {
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User) || null;
}

// ============================================================
// Sessões
// ============================================================

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
}

const SESSION_DAYS = 30;

export function createSession(userId: string): Session {
  const session: Session = {
    id: randomId(),
    user_id: userId,
    expires_at: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString(),
  };
  db.prepare('INSERT INTO sessions (id,user_id,expires_at) VALUES (@id,@user_id,@expires_at)').run(session);
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

export function getUserFromSession(sessionId: string): User | null {
  const s = getSession(sessionId);
  return s ? getUserById(s.user_id) : null;
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
