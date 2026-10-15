import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile } from '@/lib/activeProfile';
import { getQueueSettings, setQueueSettings } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Slot {
  hour: number;
  minute: number;
}

/** Gera os próximos slots a partir das configurações (em UTC). */
function upcomingSlots(
  slots: Slot[],
  daysOfWeek: number[],
  timezone: string,
  count = 10
): { datetime_utc: string; datetime_local: string; timezone: string }[] {
  const out: { datetime_utc: string; datetime_local: string; timezone: string }[] = [];
  if (!slots.length) return out;

  // Offset do fuso (em minutos) resolvido via Intl para uma data de referência
  const tzOffsetMinutes = (date: Date): number => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return (asUTC - date.getTime()) / 60000;
  };

  const now = new Date();
  const sorted = [...slots].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  for (let dayOffset = 0; dayOffset <= 14 && out.length < count; dayOffset++) {
    const base = new Date(now.getTime() + dayOffset * 864e5);
    for (const s of sorted) {
      if (out.length >= count) break;

      // Constrói o horário local desejado e converte para UTC
      const localParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(base);
      const [y, m, d] = localParts.split('-').map(Number);

      const guess = new Date(Date.UTC(y, m - 1, d, s.hour, s.minute, 0));
      const offset = tzOffsetMinutes(guess);
      const utc = new Date(guess.getTime() - offset * 60000);

      if (utc.getTime() <= now.getTime()) continue;

      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      if (!daysOfWeek.includes(dow)) continue;

      out.push({
        datetime_utc: utc.toISOString(),
        datetime_local: guess.toISOString().replace('Z', ''),
        timezone,
      });
    }
  }
  return out;
}

export async function GET() {
  const profile = getActiveProfile();
  const settings = getQueueSettings(profile.id);
  const slots = upcomingSlots(settings.slots, settings.days_of_week, settings.timezone, 10);
  return NextResponse.json({
    success: true,
    queue_settings: {
      timezone: settings.timezone,
      slots: settings.slots,
      days_of_week: settings.days_of_week,
      max_posts_per_slot: settings.max_per_slot,
    },
    slots,
    next_slot: slots[0] || null,
  });
}

export async function POST(request: NextRequest) {
  const profile = getActiveProfile();
  const body = await request.json().catch(() => ({}));

  const current = getQueueSettings(profile.id);
  const timezone = typeof body.timezone === 'string' ? body.timezone : current.timezone;
  const slots: Slot[] = Array.isArray(body.slots) ? body.slots : current.slots;
  const days: number[] = Array.isArray(body.days_of_week) ? body.days_of_week : current.days_of_week;
  const maxPerSlot = Number(body.max_posts_per_slot ?? current.max_per_slot) || 1;

  setQueueSettings({
    profile_id: profile.id,
    timezone,
    slots,
    days_of_week: days,
    max_per_slot: maxPerSlot,
  });

  return NextResponse.json({ success: true, queue_settings: { timezone, slots, days_of_week: days, max_posts_per_slot: maxPerSlot } });
}
