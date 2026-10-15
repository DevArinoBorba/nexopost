// Interface comum a todas as redes sociais (YouTube, TikTok, Meta, ...)

export type MediaKind = 'video' | 'photo' | 'text';

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  /** ISO-8601. Ausente = não expira */
  expires_at?: string;
  scope?: string;
}

export interface AccountInfo {
  external_id: string;
  display_name?: string;
  handle?: string;
  avatar_url?: string;
  meta?: Record<string, unknown>;
  /**
   * Tokens que devem substituir os originais antes de guardar.
   * Ex.: o Facebook devolve um "page token" que é o que realmente publica.
   */
  tokens?: Partial<TokenSet>;
  /**
   * Contas adicionais descobertas no mesmo fluxo (ex.: a Página do Facebook
   * ligada à conta do Instagram) — são salvas automaticamente.
   */
  linked?: { platform: string; info: AccountInfo }[];
}

export interface PublishInput {
  title?: string;
  description?: string;
  mediaType: MediaKind;
  /** Caminho local do arquivo (vídeo/foto) — caso de mídia única */
  filePath?: string;
  /** Vários arquivos (carrossel / álbum) */
  filePaths?: string[];
  mimeType?: string;
  fileSize?: number;
  /** Visibilidade (quando suportado): public | private | unlisted */
  privacy?: string;
  /** Formato do post: feed (padrão), story ou reel */
  format?: 'feed' | 'story' | 'reel';
  /** Metadados por plataforma */
  extra?: Record<string, unknown>;
  onProgress?: (percent: number) => void;
}

export interface PublishResult {
  external_post_id?: string;
  post_url?: string;
  raw?: unknown;
}

export interface SocialProvider {
  id: string;
  name: string;
  supports: MediaKind[];
  /** true se as credenciais (client id/secret) estão configuradas */
  isConfigured(): boolean;
  /** Se true, o fluxo OAuth usa PKCE (code_challenge) */
  usesPkce?: boolean;
  /**
   * Se true, após o OAuth o usuário escolhe quais Páginas conectar
   * (usado por agências que administram várias Páginas).
   */
  requiresPageSelection?: boolean;
  /** URL para onde redirecionar o usuário para autorizar */
  getAuthUrl(ctx: { state: string; codeVerifier?: string; codeChallenge?: string }): string;
  /** Troca o "code" por tokens */
  exchangeCode(ctx: { code: string; codeVerifier?: string }): Promise<TokenSet>;
  /** Renova o access token */
  refreshTokens(refreshToken: string): Promise<TokenSet>;
  /** Busca dados da conta/canal conectado */
  getAccountInfo(tokens: TokenSet): Promise<AccountInfo>;
  /** Publica o conteúdo */
  publish(ctx: { tokens: TokenSet; account: AccountInfo; input: PublishInput }): Promise<PublishResult>;
}

export class ProviderError extends Error {
  constructor(message: string, public status = 400, public details?: unknown) {
    super(message);
    this.name = 'ProviderError';
  }
}

export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (data.error_description || data.error?.message || data.error || data.message)) ||
      `HTTP ${res.status}`;
    throw new ProviderError(String(msg), res.status, data);
  }
  return data as T;
}

export function expiresAt(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
