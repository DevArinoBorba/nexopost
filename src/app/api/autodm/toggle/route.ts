import { NextRequest, NextResponse } from 'next/server';
import { toggleAutoDMRule } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID não informado' }, { status: 400 });
    }

    const updated = toggleAutoDMRule(id);
    if (!updated) {
      return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao alterar status da regra' },
      { status: 500 }
    );
  }
}
