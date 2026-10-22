import { NextRequest, NextResponse } from 'next/server';
import { runDuePosts } from '@/lib/publish';
import { db, getSetting, setSetting, type WhatsAppLinkRecord } from '@/lib/db';
import { sendWeeklyReportForWhatsAppLink } from '@/lib/whatsappNotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCurrentCampoGrandeWeekKey(): { isMondayMorning: boolean; weekKey: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Campo_Grande',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour || 0);
  const isMondayMorning = parts.weekday === 'Mon' && hour >= 8 && hour < 11;
  const weekKey = `${parts.year}-${parts.month}-${parts.day}`;
  return { isMondayMorning, weekKey };
}

async function handleSchedulerTick(forceWeeklyReport: boolean) {
  const out = await runDuePosts();
  let weeklyReportsSent = 0;

  const { isMondayMorning, weekKey } = getCurrentCampoGrandeWeekKey();
  const lastWeeklySent = getSetting('last_weekly_report_date');

  if (forceWeeklyReport || (isMondayMorning && lastWeeklySent !== weekKey)) {
    const verifiedLinks = db
      .prepare("SELECT * FROM whatsapp_links WHERE status = 'verified'")
      .all() as WhatsAppLinkRecord[];

    for (const link of verifiedLinks) {
      const res = await sendWeeklyReportForWhatsAppLink(link.id).catch(() => ({ sent_reports: 0 }));
      weeklyReportsSent += res.sent_reports;
    }

    if (!forceWeeklyReport && weeklyReportsSent > 0) {
      setSetting('last_weekly_report_date', weekKey);
    }
  }

  return {
    success: true,
    ...out,
    weeklyReportsSent,
  };
}

// Dispara a publicação dos posts agendados que já venceram + alertas de token + relatório semanal de segunda-feira.
export async function POST(request: NextRequest) {
  const forceWeekly = request.nextUrl.searchParams.get('weekly_report') === 'true';
  const res = await handleSchedulerTick(forceWeekly);
  return NextResponse.json(res);
}

export async function GET(request: NextRequest) {
  const forceWeekly = request.nextUrl.searchParams.get('weekly_report') === 'true';
  const res = await handleSchedulerTick(forceWeekly);
  return NextResponse.json(res);
}
