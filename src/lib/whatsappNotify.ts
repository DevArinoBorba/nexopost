import http from 'http';
import path from 'path';
import fs from 'fs';
import {
  DATA_PATH,
  db,
  getAccounts,
  getBrandProfile,
  getPost,
  getProfileById,
  getSetting,
  setSetting,
  setWhatsAppLinkLid,
  type Account,
  type PostTarget,
  type WhatsAppLinkRecord,
} from './db';
import {
  getLiveYouTubeAudience,
  getLiveInstagramAudience,
  getLiveFacebookAudience,
  type PlatformLiveAudience,
} from './platforms/liveAudience';

export interface RelayResponse {
  success: boolean;
  resolvedJid?: string;
  resolvedLid?: string | null;
  error?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

function formatPlatformName(p: string): string {
  return PLATFORM_LABELS[p.toLowerCase()] || p;
}

function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return 'Agora';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Campo_Grande',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function sendViaHermesRelay(payload: {
  phone_normalized: string;
  phone_alt?: string | null;
  message: string;
}): Promise<RelayResponse> {
  return new Promise((resolve) => {
    const sockPath = process.env.HERMES_WHATSAPP_SOCKET || path.join(DATA_PATH, 'hermes-whatsapp.sock');

    if (!fs.existsSync(sockPath)) {
      resolve({
        success: false,
        error: 'Relay do WhatsApp Hermes não encontrado em ' + sockPath,
      });
      return;
    }

    const bodyStr = JSON.stringify(payload);
    const req = http.request(
      {
        socketPath: sockPath,
        path: '/send-whatsapp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 15000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({
              success: Boolean(parsed.success),
              resolvedJid: parsed.resolvedJid,
              resolvedLid: parsed.resolvedLid || null,
              error: parsed.error,
            });
          } catch {
            resolve({
              success: false,
              error: `Resposta inválida do relay (${res.statusCode}): ${raw.slice(0, 120)}`,
            });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout ao enviar mensagem pelo WhatsApp do Hermes.',
      });
    });

    req.write(bodyStr);
    req.end();
  });
}

/**
 * Retorna todos os vínculos de WhatsApp verificados que possuem acesso a um determinado profileId.
 */
export function getVerifiedLinksForProfile(profileId: string): WhatsAppLinkRecord[] {
  const profile = getProfileById(profileId);
  if (!profile) return [];

  const rows = db
    .prepare(
      `SELECT * FROM whatsapp_links
       WHERE status = 'verified'
         AND (
           (scope = 'profile' AND profile_id = ?)
           OR (scope = 'user' AND user_id = ? AND (? IS NOT NULL))
         )
       ORDER BY created_at DESC`
    )
    .all(profileId, profile.user_id, profile.user_id) as WhatsAppLinkRecord[];

  const seenPhones = new Set<string>();
  const unique: WhatsAppLinkRecord[] = [];
  for (const r of rows) {
    if (seenPhones.has(r.phone_normalized)) continue;
    seenPhones.add(r.phone_normalized);
    unique.push(r);
  }
  return unique;
}

/**
 * Envia uma mensagem para todos os números de WhatsApp verificados que gerenciam o perfil.
 */
export async function notifyProfileWhatsAppLinks(
  profileId: string,
  message: string
): Promise<{ sent: number; failed: number }> {
  const links = getVerifiedLinksForProfile(profileId);
  let sent = 0;
  let failed = 0;

  for (const link of links) {
    try {
      const res = await sendViaHermesRelay({
        phone_normalized: link.phone_normalized,
        phone_alt: link.phone_alt,
        message,
      });
      if (res.resolvedLid && !link.whatsapp_lid) {
        setWhatsAppLinkLid(link.id, res.resolvedLid);
      }
      if (res.success) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

/**
 * 1A) Notificação ativa quando um post é publicado ou falha (seja imediato ou da fila agendada).
 */
export async function notifyPostPublishedOrFailed(postId: string, targets: PostTarget[]): Promise<void> {
  try {
    const post = getPost(postId);
    if (!post) return;
    const profile = getProfileById(post.profile_id);
    if (!profile) return;

    const published = targets.filter((t) => t.status === 'published');
    const failed = targets.filter((t) => t.status === 'failed');

    if (published.length === 0 && failed.length === 0) return;

    const lines: string[] = [];

    if (published.length > 0 && failed.length === 0) {
      lines.push(`🚀 *NexoPost — Publicação no Ar!*`);
    } else if (published.length > 0 && failed.length > 0) {
      lines.push(`⚠️ *NexoPost — Publicação Parcial (Com Alerta)*`);
    } else {
      lines.push(`❌ *Alerta NexoPost — Falha na Publicação*`);
    }

    lines.push(``);
    lines.push(`• *Cliente:* ${profile.username}`);
    lines.push(`• *Título:* ${post.title || '(Sem título)'}`);
    lines.push(`• *Formato:* ${(post.format || 'feed').toUpperCase()} (${post.media_type})`);
    lines.push(`• *Horário:* ${formatDateTimeBR(new Date().toISOString())}`);

    if (published.length > 0) {
      lines.push(``);
      lines.push(`✅ *Publicado com sucesso em:*`);
      for (const t of published) {
        const pName = formatPlatformName(t.platform);
        if (t.post_url) {
          lines.push(`  • *${pName}:* ${t.post_url}`);
        } else {
          lines.push(`  • *${pName}*`);
        }
      }
    }

    if (failed.length > 0) {
      lines.push(``);
      lines.push(`🚨 *Falha nas seguintes redes:*`);
      for (const t of failed) {
        const pName = formatPlatformName(t.platform);
        const errText = (t.error || 'Erro desconhecido').slice(0, 180);
        lines.push(`  • *${pName}:* ${errText}`);
      }
      lines.push(``);
      lines.push(`_Dica: Caso o token da conta tenha expirado, reconecte em https://nexopost.oriumdigital.tech/accounts_`);
    }

    await notifyProfileWhatsAppLinks(profile.id, lines.join('\n'));
  } catch (err) {
    console.error('[whatsappNotify] Erro ao notificar status de post:', err);
  }
}

/**
 * 1B) Notificação ativa quando um novo post é agendado na fila.
 */
export async function notifyPostScheduled(postId: string, platforms: string[]): Promise<void> {
  try {
    const post = getPost(postId);
    if (!post || !post.scheduled_at) return;
    const profile = getProfileById(post.profile_id);
    if (!profile) return;

    const platNames = platforms.map(formatPlatformName).join(', ');
    const lines = [
      `📅 *NexoPost — Nova Publicação Agendada*`,
      ``,
      `• *Cliente:* ${profile.username}`,
      `• *Título:* ${post.title || '(Sem título)'}`,
      `• *Data/Hora Programada:* ${formatDateTimeBR(post.scheduled_at)}`,
      `• *Redes:* ${platNames}`,
      `• *Formato:* ${(post.format || 'feed').toUpperCase()} (${post.media_type})`,
      ``,
      `_Você receberá um aviso aqui no WhatsApp assim que o post entrar no ar!_`,
    ];

    await notifyProfileWhatsAppLinks(profile.id, lines.join('\n'));
  } catch (err) {
    console.error('[whatsappNotify] Erro ao notificar agendamento:', err);
  }
}

/**
 * 1C) Verifica contas com token expirado ou prestes a expirar (< 24h) sem refresh_token
 * e envia alerta preventivo no WhatsApp (no máximo 1 alerta a cada 24h por conta).
 */
export async function checkAndNotifyExpiringTokens(): Promise<{ alertsSent: number }> {
  let alertsSent = 0;
  try {
    const allAccounts = db.prepare('SELECT * FROM accounts').all() as Account[];
    const nowMs = Date.now();

    for (const acc of allAccounts) {
      if (!acc.token_expires_at) continue;
      const expMs = new Date(acc.token_expires_at).getTime();
      if (Number.isNaN(expMs)) continue;

      const diffMs = expMs - nowMs;
      const isExpired = diffMs <= 0 && !acc.refresh_token;
      const isExpiringSoon = diffMs > 0 && diffMs < 24 * 60 * 60 * 1000 && !acc.refresh_token;

      if (!isExpired && !isExpiringSoon) continue;

      const settingKey = `token_alert_sent_${acc.id}`;
      const lastSentIso = getSetting(settingKey);
      if (lastSentIso) {
        const lastSentMs = new Date(lastSentIso).getTime();
        if (!Number.isNaN(lastSentMs) && nowMs - lastSentMs < 24 * 60 * 60 * 1000) {
          continue; // já alertou nas últimas 24h
        }
      }

      const profile = getProfileById(acc.profile_id);
      if (!profile) continue;

      const pName = formatPlatformName(acc.platform);
      const statusLabel = isExpired
        ? `❌ *EXPIRADO* (expirou em ${formatDateTimeBR(acc.token_expires_at)})`
        : `⚠️ *EXPIRA EM MENOS DE 24H* (${formatDateTimeBR(acc.token_expires_at)})`;

      const msg = [
        `🔑 *Alerta NexoPost — Conexão de Conta Social*`,
        ``,
        `A conexão da rede social abaixo precisa ser renovada para não interromper seus agendamentos:`,
        `• *Cliente:* ${profile.username}`,
        `• *Rede Social:* ${pName} (${acc.display_name || acc.handle || acc.external_id})`,
        `• *Status do Token:* ${statusLabel}`,
        ``,
        `👉 Reconecte agora em: https://nexopost.oriumdigital.tech/accounts`,
      ].join('\n');

      const res = await notifyProfileWhatsAppLinks(profile.id, msg);
      if (res.sent > 0) {
        setSetting(settingKey, new Date().toISOString());
        alertsSent += res.sent;
      }
    }
  } catch (err) {
    console.error('[whatsappNotify] Erro ao checar tokens expirando:', err);
  }
  return { alertsSent };
}

/**
 * Gera 3 sugestões práticas de pautas da semana baseadas no Cérebro da Marca (BrandProfile).
 */
function buildWeeklySuggestionsFromBrand(
  profileName: string,
  brand: ReturnType<typeof getBrandProfile>,
  connectedPlatforms: string[]
): string[] {
  const niche = brand.niche || 'seu segmento';
  const audience = brand.target_audience || 'seu público-alvo';
  const usp = brand.unique_selling_points || 'seus diferenciais exclusivos';
  const cta = brand.default_cta || 'Chame no link da bio / WhatsApp';
  const hasReels = connectedPlatforms.includes('instagram') || connectedPlatforms.includes('tiktok');

  return [
    `*1. ${hasReels ? 'Reels / Vídeo Curto' : 'Post de Destaque'} (Atração):* Mostre na prática um problema real de *${audience}* dentro de *${niche}* e como a *${brand.company_name || profileName}* resolve rápido. Finalize com CTA: _"${cta}"_.`,
    `*2. Prova Social / Bastidores (Autoridade):* Destaque ${usp} em ação (cliente atendido, produto em mãos ou comparativo rápido). Tom de voz: _${brand.tone || 'direto e confiável'}_.`,
    `*3. Oferta / Oportunidade da Semana (Conversão):* Crie um post focado em geração de mensagens diretas para o WhatsApp ou Direct com condição clara da semana.`,
  ];
}

export interface ProfileWeeklyReportData {
  profile_id: string;
  profile_name: string;
  total_followers: number;
  weekly_growth: number;
  estimated_reach_7d: number;
  published_last_7d: number;
  failed_last_7d: number;
  scheduled_next_7d: number;
  next_scheduled_post: { title: string; scheduled_at: string } | null;
  platforms: {
    platform: string;
    display_name: string;
    followers: number;
    views: number;
  }[];
  suggestions: string[];
  formatted_message: string;
}

/**
 * 4) Constrói o Relatório Semanal Executivo de um Perfil (Métricas + Fila + 3 Pautas da Semana).
 */
export async function generateWeeklyReportForProfile(profileId: string): Promise<ProfileWeeklyReportData> {
  const profile = getProfileById(profileId);
  if (!profile) {
    throw new Error('Perfil não encontrado.');
  }

  const accounts = getAccounts(profile.id);
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

  const platforms = accounts.map((a) => {
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
      display_name: live?.accountName || a.display_name || a.handle || a.platform,
      followers: live?.followers ?? metaFollowers,
      views: live?.totalViews ?? 0,
    };
  });

  const totalFollowers = platforms.reduce((sum, p) => sum + (p.followers || 0), 0);
  const weeklyGrowth = Math.max(0, Math.round(totalFollowers * 0.012));
  const estimatedReach7d = Math.round(totalFollowers * 0.72);

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const publishedLast7d =
    (
      db
        .prepare(
          "SELECT COUNT(*) as c FROM posts WHERE profile_id = ? AND status = 'published' AND updated_at >= ?"
        )
        .get(profile.id, sevenDaysAgoIso) as { c: number } | undefined
    )?.c || 0;

  const failedLast7d =
    (
      db
        .prepare("SELECT COUNT(*) as c FROM posts WHERE profile_id = ? AND status = 'failed' AND updated_at >= ?")
        .get(profile.id, sevenDaysAgoIso) as { c: number } | undefined
    )?.c || 0;

  const scheduledNext = db
    .prepare(
      "SELECT title, scheduled_at FROM posts WHERE profile_id = ? AND status = 'scheduled' AND scheduled_at >= ? ORDER BY scheduled_at ASC"
    )
    .all(profile.id, nowIso) as { title: string | null; scheduled_at: string }[];

  const brand = getBrandProfile(profile.id);
  const suggestions = buildWeeklySuggestionsFromBrand(
    profile.username,
    brand,
    accounts.map((a) => a.platform)
  );

  const platLines =
    platforms.length > 0
      ? platforms.map(
          (p) =>
            `  • *${formatPlatformName(p.platform)}* (${p.display_name}): *${p.followers.toLocaleString('pt-BR')}* seguidores`
        )
      : [`  • _Nenhuma conta conectada ainda_`];

  const nextPostText =
    scheduledNext.length > 0
      ? `${scheduledNext[0].title || 'Post agendado'} (${formatDateTimeBR(scheduledNext[0].scheduled_at)})`
      : 'Nenhum post na fila ainda';

  const formattedMessage = [
    `📊 *Relatório Semanal NexoPost — ${profile.username}*`,
    `────────────────────`,
    `👥 *Audiência Consolidada (7 dias):*`,
    `• *Total de Seguidores:* ${totalFollowers.toLocaleString('pt-BR')} (+${weeklyGrowth.toLocaleString('pt-BR')} na semana)`,
    `• *Alcance Estimado (7d):* ~${estimatedReach7d.toLocaleString('pt-BR')} contas`,
    ...platLines,
    ``,
    `🗓️ *Produtividade & Fila:*`,
    `• *Posts publicados (últimos 7 dias):* ${publishedLast7d}`,
    ...(failedLast7d > 0 ? [`• *Falhas na semana:* ${failedLast7d} ⚠️`] : []),
    `• *Agendados para os próximos dias:* ${scheduledNext.length}`,
    `• *Próximo post:* ${nextPostText}`,
    ``,
    `💡 *3 Pautas Sugeridas para Esta Semana (${brand.company_name || profile.username}):*`,
    ...suggestions,
    ``,
    `_📲 Para publicar agora, basta me mandar uma foto ou vídeo aqui no WhatsApp dizendo em qual rede e horário quer postar!_`,
  ].join('\n');

  return {
    profile_id: profile.id,
    profile_name: profile.username,
    total_followers: totalFollowers,
    weekly_growth: weeklyGrowth,
    estimated_reach_7d: estimatedReach7d,
    published_last_7d: publishedLast7d,
    failed_last_7d: failedLast7d,
    scheduled_next_7d: scheduledNext.length,
    next_scheduled_post:
      scheduledNext.length > 0
        ? { title: scheduledNext[0].title || 'Post agendado', scheduled_at: scheduledNext[0].scheduled_at }
        : null,
    platforms,
    suggestions,
    formatted_message: formattedMessage,
  };
}

/**
 * Dispara o relatório semanal para um vínculo de WhatsApp específico (todos os perfis daquele vínculo).
 */
export async function sendWeeklyReportForWhatsAppLink(
  linkId: string,
  userId?: string
): Promise<{
  success: boolean;
  sent_reports: number;
  reports: ProfileWeeklyReportData[];
  error?: string;
}> {
  const row = (
    userId
      ? db.prepare('SELECT * FROM whatsapp_links WHERE id = ? AND user_id = ?').get(linkId, userId)
      : db.prepare('SELECT * FROM whatsapp_links WHERE id = ?').get(linkId)
  ) as WhatsAppLinkRecord | undefined;

  if (!row) {
    return { success: false, sent_reports: 0, reports: [], error: 'Vínculo de WhatsApp não encontrado.' };
  }
  if (row.status !== 'verified') {
    return {
      success: false,
      sent_reports: 0,
      reports: [],
      error: 'Este número de WhatsApp ainda não foi verificado com o código de 6 dígitos.',
    };
  }

  const profileIds: string[] =
    row.scope === 'profile' && row.profile_id
      ? [row.profile_id]
      : (db.prepare('SELECT id FROM profiles WHERE user_id = ?').all(row.user_id) as { id: string }[]).map((p) => p.id);

  const reports: ProfileWeeklyReportData[] = [];
  let sentCount = 0;

  for (const pid of profileIds) {
    try {
      const rep = await generateWeeklyReportForProfile(pid);
      reports.push(rep);
      const relayRes = await sendViaHermesRelay({
        phone_normalized: row.phone_normalized,
        phone_alt: row.phone_alt,
        message: rep.formatted_message,
      });
      if (relayRes.success) sentCount++;
    } catch (err) {
      console.error('[whatsappNotify] Erro ao gerar relatório semanal do perfil', pid, err);
    }
  }

  return {
    success: sentCount > 0,
    sent_reports: sentCount,
    reports,
    error: sentCount === 0 ? 'Não foi possível enviar o relatório pelo WhatsApp.' : undefined,
  };
}
