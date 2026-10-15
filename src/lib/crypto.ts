import crypto from 'crypto';

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY não definida em .env.local');
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY deve ter 32 bytes (base64 ou hex de 64 chars)');
  }
  return buf;
}

// AES-256-GCM: iv.tag.ciphertext (tudo base64)
export function encryptSecret(plain: string): string {
  if (plain === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload) return '';
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Formato de token criptografado inválido');
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

export function randomId(): string {
  return crypto.randomUUID();
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// PKCE
export function pkceVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Estado assinado (evita CSRF no callback OAuth)
export function signState(data: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', getKey()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyState<T = Record<string, unknown>>(state: string): T {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('State inválido');
  const expected = crypto.createHmac('sha256', getKey()).update(payload).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Assinatura do state inválida');
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (data.exp && Date.now() > data.exp) throw new Error('State expirado');
  return data as T;
}
