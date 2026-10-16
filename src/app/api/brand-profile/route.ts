import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile, getCurrentUser } from '@/lib/activeProfile';
import { getBrandProfile, upsertBrandProfile, getProfiles, getProfileById } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getCurrentUser();
    const activeProfile = getActiveProfile();
    const requestedProfileId = req.nextUrl.searchParams.get('profile_id') || activeProfile.id;

    const targetProfile = getProfileById(requestedProfileId);
    const resolvedProfile =
      targetProfile && targetProfile.user_id === user.id ? targetProfile : activeProfile;

    const brandProfile = getBrandProfile(resolvedProfile.id);
    const profiles = getProfiles(user.id);

    return NextResponse.json({
      success: true,
      profile: { id: resolvedProfile.id, username: resolvedProfile.username },
      activeProfileId: activeProfile.id,
      profiles: profiles.map((p) => ({ id: p.id, username: p.username })),
      brandProfile,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getCurrentUser();
    const activeProfile = getActiveProfile();
    const body = await req.json();

    const requestedProfileId = body.profile_id || activeProfile.id;
    const targetProfile = getProfileById(requestedProfileId);
    const resolvedProfile =
      targetProfile && targetProfile.user_id === user.id ? targetProfile : activeProfile;

    const saved = upsertBrandProfile({
      profile_id: resolvedProfile.id,
      company_name: body.company_name ?? '',
      niche: body.niche ?? '',
      location: body.location ?? '',
      target_audience: body.target_audience ?? '',
      unique_selling_points: body.unique_selling_points ?? '',
      tone: body.tone ?? '',
      default_cta: body.default_cta ?? '',
      rules_to_avoid: body.rules_to_avoid ?? '',
    });

    return NextResponse.json({
      success: true,
      profile: { id: resolvedProfile.id, username: resolvedProfile.username },
      brandProfile: saved,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export const POST = PUT;
