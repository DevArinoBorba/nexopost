import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiKeyAuth';
import { getAccounts, getBrandProfile, type Account } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function getTokenStatus(a: Account): 'valid' | 'expiring_soon' | 'expired' | 'permanent' {
  if (!a.token_expires_at) return 'permanent';
  const exp = new Date(a.token_expires_at).getTime();
  const diff = exp - Date.now();
  if (diff <= 0) return a.refresh_token ? 'valid' : 'expired';
  if (diff < 24 * 60 * 60 * 1000) return 'expiring_soon';
  return 'valid';
}

export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  const { profile } = auth;
  const accounts = getAccounts(profile.id).map((a) => {
    const meta = parseMeta(a.meta);
    return {
      id: a.id,
      platform: a.platform,
      external_id: a.external_id,
      name: a.display_name,
      display_name: a.display_name,
      handle: a.handle,
      avatar_url: a.avatar_url,
      connected: true,
      followers: Number(meta.followers ?? 0),
      token_status: getTokenStatus(a),
      connected_at: a.created_at,
      updated_at: a.updated_at,
    };
  });

  const brandProfile = getBrandProfile(profile.id);

  return NextResponse.json({
    success: true,
    profile: profile.username,
    profile_info: {
      id: profile.id,
      username: profile.username,
    },
    accounts,
    brand_profile: brandProfile,
  });
}
