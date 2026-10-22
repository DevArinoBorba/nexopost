import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/apiKeyAuth';
import { generateWeeklyReportForProfile, notifyProfileWhatsAppLinks } from '@/lib/whatsappNotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  try {
    const { profile } = auth;
    const { searchParams } = new URL(request.url);
    const sendWhatsApp = searchParams.get('send_whatsapp') === 'true' || searchParams.get('send_whatsapp') === '1';

    const report = await generateWeeklyReportForProfile(profile.id);
    let whatsappDelivery = { sent: 0, failed: 0 };

    if (sendWhatsApp) {
      whatsappDelivery = await notifyProfileWhatsAppLinks(profile.id, report.formatted_message);
    }

    return NextResponse.json({
      success: true,
      report,
      whatsapp_delivery: whatsappDelivery,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message || 'Erro ao gerar relatório semanal.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  if (!auth.ok) return auth.response;

  try {
    const { profile } = auth;
    const body = await request.json().catch(() => ({}));
    const sendWhatsApp = body.send_whatsapp !== false;

    const report = await generateWeeklyReportForProfile(profile.id);
    let whatsappDelivery = { sent: 0, failed: 0 };

    if (sendWhatsApp) {
      whatsappDelivery = await notifyProfileWhatsAppLinks(profile.id, report.formatted_message);
    }

    return NextResponse.json({
      success: true,
      report,
      whatsapp_delivery: whatsappDelivery,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message || 'Erro ao gerar relatório semanal.' },
      { status: 500 }
    );
  }
}
