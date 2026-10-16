import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import {
  getAutoDMRules,
  createAutoDMRule,
  updateAutoDMRule,
  deleteAutoDMRule,
  getAutoDMLogs,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const profile = getActiveProfile();
    const rules = getAutoDMRules(profile.id);
    const logs = getAutoDMLogs(profile.id, 50);

    return NextResponse.json({
      success: true,
      profile: { id: profile.id, username: profile.username },
      rules,
      logs,
    });
  } catch (error) {
    console.error('Error fetching AutoDM data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao buscar regras de AutoDM' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = getActiveProfile();
    const body = await req.json();

    if (!body.name || !body.dm_message) {
      return NextResponse.json(
        { error: 'Nome da automação e mensagem de DM são obrigatórios' },
        { status: 400 }
      );
    }

    if (body.id) {
      // Atualizar regra existente
      const updated = updateAutoDMRule(body.id, {
        name: body.name,
        platform: body.platform || 'instagram',
        account_id: body.account_id || null,
        trigger_type: body.trigger_type || 'keyword',
        keywords: Array.isArray(body.keywords) ? body.keywords : [],
        post_id: body.post_id || null,
        reply_comments: Array.isArray(body.reply_comments) ? body.reply_comments : [],
        dm_message: body.dm_message,
        delay_seconds: Number(body.delay_seconds) || 5,
        status: body.status || 'active',
      });
      return NextResponse.json({ success: true, rule: updated });
    }

    // Criar nova regra
    const created = createAutoDMRule({
      profile_id: profile.id,
      name: body.name,
      platform: body.platform || 'instagram',
      account_id: body.account_id || null,
      trigger_type: body.trigger_type || 'keyword',
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      post_id: body.post_id || null,
      reply_comments: Array.isArray(body.reply_comments) ? body.reply_comments : [],
      dm_message: body.dm_message,
      delay_seconds: Number(body.delay_seconds) || 5,
      status: body.status || 'active',
    });

    return NextResponse.json({ success: true, rule: created });
  } catch (error) {
    console.error('Error saving AutoDM rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao salvar regra' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID não informado' }, { status: 400 });
    }

    deleteAutoDMRule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AutoDM rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao excluir regra' },
      { status: 500 }
    );
  }
}
