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
  id?: string;
  platform: string;
  external_id: string | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  connected_at: string;
  updated_at?: string;
  token_expires_at?: string | null;
  has_refresh_token?: boolean;
  token_status?: 'valid' | 'expiring_soon' | 'expired' | 'permanent';
  meta?: Record<string, unknown>;
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

export interface UserAccountView {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  company?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
  created_at: string;
  profile_count?: number;
  account_count?: number;
  post_count?: number;
  active_sessions?: number;
}

export interface SessionView {
  id: string;
  created_at: string | null;
  expires_at: string;
  user_agent: string;
  ip_address: string;
  is_current: boolean;
}

export const backend = {
  getAccounts: () => fetch('/api/accounts', { cache: 'no-store' }).then(json<AccountsResponse>),

  syncAccounts: (platform?: string) =>
    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(platform ? { platform } : {}),
    }).then(
      json<{
        success: boolean;
        results: { platform: string; ok: boolean; display_name?: string | null; followers?: number; error?: string }[];
        accounts: ConnectedAccount[];
      }>
    ),

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

  // ----- Conta do Usuário Logado & Sessões (/api/auth/me) -----
  getMe: () =>
    fetch('/api/auth/me', { cache: 'no-store' }).then(
      json<{
        authenticated: boolean;
        currentSessionId: string | null;
        user: UserAccountView;
        profile: { id: string; username: string };
        profiles: { id: string; username: string; account_count: number; platforms: string[] }[];
        sessions: SessionView[];
      }>
    ),

  updateMe: (data: {
    name?: string;
    email?: string;
    company?: string;
    phone?: string;
    avatar_url?: string;
    profileName?: string;
  }) =>
    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json<{ success: boolean; user: UserAccountView; profile: { id: string; username: string } }>),

  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_password', ...data }),
    }).then(json<{ success: boolean; message: string }>),

  revokeSession: (sessionId: string) =>
    fetch(`/api/auth/me?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).then(
      json<{ success: boolean }>
    ),

  revokeOtherSessions: () =>
    fetch('/api/auth/me?other_sessions=1', { method: 'DELETE' }).then(json<{ success: boolean; removed: number }>),

  // ----- Gestão de Usuários (/api/users) -----
  getUsers: () =>
    fetch('/api/users', { cache: 'no-store' }).then(
      json<{ users: UserAccountView[]; currentUserId: string; canManage: boolean }>
    ),

  createUserAccount: (data: {
    name: string;
    email: string;
    password: string;
    plan?: string;
    role?: 'admin' | 'user';
    company?: string;
    phone?: string;
    initialProfileName?: string;
  }) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json<{ success: boolean; user: UserAccountView; users: UserAccountView[] }>),

  updateUserAccount: (data: {
    id: string;
    name?: string;
    email?: string;
    plan?: string;
    role?: 'admin' | 'user';
    status?: 'active' | 'suspended';
    company?: string;
    phone?: string;
    newPassword?: string;
  }) =>
    fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json<{ success: boolean; user: UserAccountView; users: UserAccountView[] }>),

  deleteUserAccount: (id: string) =>
    fetch(`/api/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(
      json<{ success: boolean; users: UserAccountView[] }>
    ),

  switchUserAccount: (userId: string) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'switch_user', userId }),
    }).then(json<{ success: boolean; user: UserAccountView; profile: { id: string; username: string } }>),

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

  renameProfile: (id: string, username: string) =>
    fetch('/api/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username }),
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

  // ----- AutoDM -----
  getAutoDM: () =>
    fetch('/api/autodm', { cache: 'no-store' }).then(
      json<{
        success: boolean;
        profile: { id: string; username: string };
        rules: AutoDMRuleView[];
        logs: AutoDMLogView[];
      }>
    ),

  saveAutoDMRule: (data: Partial<AutoDMRuleView>) =>
    fetch('/api/autodm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json<{ success: boolean; rule: AutoDMRuleView }>),

  deleteAutoDMRule: (id: string) =>
    fetch(`/api/autodm?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(json<{ success: boolean }>),

  toggleAutoDMRule: (id: string) =>
    fetch('/api/autodm/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(json<{ success: boolean; rule: AutoDMRuleView }>),

  testAutoDM: (data: { comment: string; username?: string; ruleId?: string }) =>
    fetch('/api/autodm/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(
      json<{
        matched: boolean;
        rule?: AutoDMRuleView;
        reply?: string;
        dm?: string;
        delaySeconds?: number;
        message?: string;
        log?: AutoDMLogView;
      }>
    ),

  // ----- Audiência -----
  getAudience: (platform = 'all', period = '30d') =>
    fetch(`/api/audience?platform=${encodeURIComponent(platform)}&period=${encodeURIComponent(period)}`, {
      cache: 'no-store',
    }).then(json<AudienceResponse>),

  // ----- Gemini AI -----
  generateAICopy: (data: { topic: string; platform?: string; tone?: string; duration?: number }) =>
    fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(
      json<{
        success: boolean;
        data: {
          title: string;
          alternativeTitles: string[];
          description: string;
          callToAction?: string;
          hashtags: string[];
        };
      }>
    ),
};

export interface AutoDMRuleView {
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

export interface AutoDMLogView {
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

export interface AudienceResponse {
  success: boolean;
  profile: { id: string; username: string };
  platform: string;
  period: string;
  connectedPlatforms: string[];
  isRealData?: boolean;
  notes?: string;
  accountName?: string;
  accountHandle?: string;
  avatarUrl?: string;
  realAccounts?: {
    platform: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    followers: number;
    views: number;
    verified_at: string | null;
  }[];
  overview: {
    followers: number;
    growth: number;
    growthPercent: number;
    engagementRate: number;
    reach: number;
  };
  genderData: { name: string; percentage: number; color: string }[];
  ageData: { age: string; percentage: number; female: number; male: number }[];
  topCountries: { country: string; code: string; percentage: number; followers: number }[];
  topCities: { city: string; state: string; percentage: number }[];
  activityHeatmap: { day: string; dayIndex: number; hours: { hour: string; intensity: number }[] }[];
  interests: { topic: string; affinity: number }[];
  recommendations: { title: string; description: string; tag: string; impact: string }[];
}

