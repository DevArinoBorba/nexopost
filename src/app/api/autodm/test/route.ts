import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { getAutoDMRules, createAutoDMLog } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const profile = getActiveProfile();
    const { comment, username, ruleId } = await req.json();

    if (!comment || typeof comment !== 'string') {
      return NextResponse.json({ error: 'Comentário de teste é obrigatório' }, { status: 400 });
    }

    const testUser = (username && username.trim()) || 'cliente_exemplo';
    const cleanComment = comment.trim().toLowerCase();

    const rules = getAutoDMRules(profile.id);
    let matchedRule = null;

    if (ruleId) {
      matchedRule = rules.find((r) => r.id === ruleId) || null;
    } else {
      // Encontrar a primeira regra ativa que bata com as palavras-chave
      matchedRule = rules.find((r) => {
        if (r.status !== 'active') return false;
        if (r.trigger_type === 'any_comment') return true;
        if (!r.keywords || r.keywords.length === 0) return true;
        return r.keywords.some((kw) => cleanComment.includes(kw.toLowerCase().trim()));
      }) || null;
    }

    if (!matchedRule) {
      return NextResponse.json({
        matched: false,
        message: 'Nenhuma regra correspondeu a este comentário.',
      });
    }

    // Selecionar aleatoriamente uma variação de resposta pública
    const replyVariations = matchedRule.reply_comments.length > 0
      ? matchedRule.reply_comments
      : ['Olá! Te enviei uma mensagem no direct! 🚀'];
    const chosenReply = replyVariations[Math.floor(Math.random() * replyVariations.length)];

    // Montar a mensagem privada substituindo placeholders
    const formattedDM = matchedRule.dm_message
      .replace(/\{nome\}/gi, testUser)
      .replace(/\{arroba\}/gi, `@${testUser}`)
      .replace(/\{username\}/gi, testUser);

    // Criar um log com status 'simulated' para histórico
    const log = createAutoDMLog({
      profile_id: profile.id,
      rule_id: matchedRule.id,
      commenter_username: testUser,
      comment_text: comment,
      reply_text: chosenReply,
      dm_status: 'simulated',
    });

    return NextResponse.json({
      matched: true,
      rule: matchedRule,
      reply: chosenReply,
      dm: formattedDM,
      delaySeconds: matchedRule.delay_seconds,
      log,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na simulação' },
      { status: 500 }
    );
  }
}
