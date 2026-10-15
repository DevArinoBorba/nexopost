'use client';

// Cliente do backend próprio (self-hosted) — substitui o upload-post.com

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in (data as any) && (data as any).error) ||
      `Erro ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export interface ConnectedAccount {
  platform: string;
  external_id: string | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  connected_at: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  supports: ('video' | 'photo' | 'text')[];
  configured: boolean;
}

export interface AccountsResponse {
  profile: { id: string; username: string };
  accounts: ConnectedAccount[];
  providers: ProviderInfo[];
}

export interface PostTargetView {
  platform: string;
  status: string;
  post_url: string | null;
  error: string | null;
  published_at: string | null;
}

export interface PostView {
  id: string;
  title: string | null;
  description: string | null;
  media_type: 'video' | 'photo' | 'text';
  status: string;
  scheduled_at: string | null;
  timezone: string | null;
  source_filename: string | null;
  created_at: string;
  targets: PostTargetView[];
}

export interface ScheduledPostView {
  job_id: string;
  scheduled_date: string;
  post_type: string;
  title: string | null;
  platforms: string[];
}

export const backend = {
  getAccounts: () => fetch('/api/accounts', { cache: 'no-store' }).then(json<AccountsResponse>),

  disconnect: (platform: string) =>
    fetch(`/api/accounts?platform=${encodeURIComponent(platform)}`, { method: 'DELETE' }).then(json<{ success: boolean }>),

  getPosts: (limit = 50) =>
    fetch(`/api/posts?limit=${limit}`, { cache: 'no-store' }).then(json<{ posts: PostView[] }>),

  getSchedule: () =>
    fetch('/api/schedule', { cache: 'no-store' }).then(json<{ scheduled_posts: ScheduledPostView[]; total: number }>),

  cancelSchedule: (id: string) => fetch(`/api/schedule/${id}`, { method: 'DELETE' }).then(json<{ success: boolean }>),

  reschedule: (id: string, iso: string) =>
    fetch(`/api/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_date: iso }),
    }).then(json<{ success: boolean }>),

  getQueue: () =>
    fetch('/api/queue', { cache: 'no-store' }).then(
      json<{
        success: boolean;
        queue_settings: { timezone: string; slots: { hour: number; minute: number }[]; days_of_week: number[]; max_posts_per_slot: number };
        slots: { datetime_utc: string; datetime_local: string; timezone: string }[];
        next_slot: { datetime_utc: string; datetime_local: string; timezone: string } | null;
      }>
    ),

  saveQueue: (data: {
    timezone: string;
    slots: { hour: number; minute: number }[];
    days_of_week: number[];
    max_posts_per_slot?: number;
  }) =>
    fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json<{ success: boolean }>),

  publish: (formData: FormData) =>
    fetch('/api/publish', { method: 'POST', body: formData }).then(
      json<{
        success?: boolean;
        post_id?: string;
        status?: string;
        scheduled_at?: string;
        platforms?: string[];
        results?: { platform: string; success: boolean; post_url?: string | null; error?: string | null }[];
        error?: string;
      }>
    ),

  runScheduler: () => fetch('/api/scheduler/run', { method: 'POST' }).then(json<{ success: boolean; processed: number }>),

  // ----- Clientes (perfis) -----
  getProfiles: () =>
    fetch('/api/profiles', { cache: 'no-store' }).then(
      json<{ profiles: { id: string; username: string; account_count: number; platforms: string[] }[] }>
    ),

  createProfile: (username: string) =>
    fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).then(json<{ success: boolean; profile: { id: string; username: string } }>),

  deleteProfile: (id: string) =>
    fetch(`/api/profiles?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(json<{ success: boolean }>),

  setActiveProfile: (id: string) => {
    document.cookie = `active_profile=${id}; path=/; max-age=31536000; samesite=lax`;
  },

  getActiveProfileCookie: (): string | null => {
    const m = document.cookie.match(/(?:^|;\s*)active_profile=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  },

  // ----- Meta (Páginas) -----
  getMetaPages: (session: string) =>
    fetch(`/api/meta/pages?session=${encodeURIComponent(session)}`, { cache: 'no-store' }).then(
      json<{
        pages: { id: string; name: string; avatar?: string; instagram: { id: string; username?: string } | null }[];
      }>
    ),

  connectMetaPage: (data: { session: string; pageId: string; profileId: string; platforms?: string[] }) =>
    fetch('/api/meta/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json<{ success: boolean; connected: string[]; profile: { username: string }; accounts: string[] }>),

  disconnectFromProfile: (profileId: string, platform: string) =>
    fetch(`/api/meta/pages?profile_id=${encodeURIComponent(profileId)}&platform=${encodeURIComponent(platform)}`, {
      method: 'DELETE',
    }).then(json<{ success: boolean }>),
};
