import { NextRequest, NextResponse } from 'next/server';
import { generateSocialCopy } from '@/lib/gemini';

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

    const result = await generateSocialCopy({
      topic,
      platform: body.platform,
      tone: body.tone,
      videoDurationSeconds: body.duration,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Erro na geração com Gemini:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na comunicação com a API do Gemini' },
      { status: 500 }
    );
  }
}
