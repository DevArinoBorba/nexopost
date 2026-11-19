import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiKeyAuth';
import { getAccounts, getBrandProfile, getProfiles } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  const profiles = getProfiles(auth.user.id).map((p) => {
    const accounts = getAccounts(p.id).map((a) => ({
      id: a.id,
      platform: a.platform,
      display_name: a.display_name,
      handle: a.handle,
      external_id: a.external_id,
    }));
    const brand = getBrandProfile(p.id);
    return {
      id: p.id,
      name: p.username,
      username: p.username,
      is_default_for_key: p.id === auth.apiKey.profile_id,
      accounts,
      platforms: Array.from(new Set(accounts.map((a) => a.platform))),
      brand_profile: brand,
    };
  });

  return NextResponse.json({
    success: true,
    total: profiles.length,
    profiles,
  });
}
