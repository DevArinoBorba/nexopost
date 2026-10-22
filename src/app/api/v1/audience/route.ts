import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiKeyAuth';
import { getAccounts, getBrandProfile } from '@/lib/db';
import {
  getLiveYouTubeAudience,
  getLiveInstagramAudience,
  getLiveFacebookAudience,
  type PlatformLiveAudience,
} from '@/lib/platforms/liveAudience';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  try {
    const { profile } = auth;
    const accounts = getAccounts(profile.id);
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'all';
    const period = searchParams.get('period') || '30d';

    const connectedPlatforms = accounts.map((a) => a.platform);
    const periodMultiplier = period === '7d' ? 0.25 : period === '90d' ? 2.8 : 1.0;

    const ytAccount = accounts.find((a) => a.platform === 'youtube');
    const igAccount = accounts.find((a) => a.platform === 'instagram');
    const fbAccount = accounts.find((a) => a.platform === 'facebook');

    const [ytRes, igRes, fbRes] = await Promise.allSettled([
      ytAccount ? getLiveYouTubeAudience(ytAccount) : Promise.resolve(null),
      igAccount ? getLiveInstagramAudience(igAccount) : Promise.resolve(null),
      fbAccount ? getLiveFacebookAudience(fbAccount) : Promise.resolve(null),
    ]);

    const liveData: Record<string, PlatformLiveAudience | null> = {
      youtube: ytRes.status === 'fulfilled' ? ytRes.value : null,
      instagram: igRes.status === 'fulfilled' ? igRes.value : null,
      facebook: fbRes.status === 'fulfilled' ? fbRes.value : null,
    };

    const perPlatform = accounts.map((a) => {
      let metaFollowers = 0;
      try {
        const parsed = a.meta ? JSON.parse(a.meta) : {};
        metaFollowers = Number(parsed.followers || 0);
      } catch {
        metaFollowers = 0;
      }
      const live = liveData[a.platform];
      return {
        platform: a.platform,
        display_name: live?.accountName || a.display_name,
        handle: live?.accountHandle || a.handle,
        followers: live?.followers ?? metaFollowers,
        views: live?.totalViews ?? 0,
        is_live: Boolean(live),
        notes: live?.notes || null,
      };
    });

    const totalFollowers = perPlatform.reduce((sum, p) => sum + (p.followers || 0), 0);
    const baseGrowth = Math.max(0, Math.round(totalFollowers * 0.048 * periodMultiplier));
    const estimatedReach = Math.round(totalFollowers * 2.85 * periodMultiplier);
    const brandProfile = getBrandProfile(profile.id);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
      },
      platform,
      period,
      connected_platforms: connectedPlatforms,
      overview: {
        followers: totalFollowers,
        growth: baseGrowth,
        growth_percent: totalFollowers > 0 ? +(baseGrowth / totalFollowers * 100).toFixed(1) : 0,
        engagement_rate: platform === 'instagram' ? 4.8 : platform === 'youtube' ? 5.2 : 3.9,
        reach: estimatedReach,
      },
      accounts: perPlatform,
      brand_profile: brandProfile,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message || 'Falha ao buscar métricas de audiência.' },
      { status: 500 }
    );
  }
}
