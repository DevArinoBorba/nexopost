import { NextRequest, NextResponse } from 'next/server';
import { generateSocialCopy } from '@/lib/gemini';
import { getActiveProfile } from '@/lib/activeProfile';
import { getBrandProfile } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json(
        { error: 'Informe um tema, título provisório ou contexto para a IA gerar o conteúdo.' },
        { status: 400 }
      );
    }

    const activeProfile = getActiveProfile();
    const brandProfile = getBrandProfile(body.profile_id || activeProfile.id);

    const result = await generateSocialCopy({
      topic,
      platform: body.platform,
      tone: body.tone,
      videoDurationSeconds: body.duration,
      brandProfile,
    });

    return NextResponse.json({
      success: true,
      data: result,
      brandProfile: {
        profile_id: brandProfile.profile_id,
        company_name: brandProfile.company_name,
        hasContext: Boolean(
          brandProfile.company_name ||
            brandProfile.niche ||
            brandProfile.target_audience ||
            brandProfile.unique_selling_points
        ),
      },
    });
  } catch (error) {
    console.error('Erro na geração com Gemini:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na comunicação com a API do Gemini' },
      { status: 500 }
    );
  }
}
