'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { backend } from '@/lib/client';
import {
  Layers,
  Plus,
  Clock,
  Check,
  Calendar,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
} from 'lucide-react';

interface Slot {
  hour: number;
  minute: number;
}

interface UpcomingSlot {
  datetime_utc: string;
  datetime_local: string;
  timezone: string;
}

const TIMEZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Lisbon',
  'Asia/Tokyo',
];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function QueuePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [timezone, setTimezone] = useState('UTC');
  const [maxPerSlot, setMaxPerSlot] = useState(1);
  const [upcoming, setUpcoming] = useState<UpcomingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await backend.getQueue();
      setSlots(data.queue_settings.slots || []);
      setDays(data.queue_settings.days_of_week || [0, 1, 2, 3, 4, 5, 6]);
      setTimezone(data.queue_settings.timezone || 'UTC');
      setMaxPerSlot(data.queue_settings.max_posts_per_slot || 1);
      setUpcoming(data.slots || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await backend.saveQueue({ timezone, slots, days_of_week: days, max_posts_per_slot: maxPerSlot });
      setSaved(true);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addSlot = () => setSlots((prev) => [...prev, { hour: 12, minute: 0 }]);
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, field: keyof Slot, value: number) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <AppShell title="Fila" subtitle="Fila de publicação do servidor próprio">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#101d27] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-[#6046ff] dark:text-[#a08fff]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {loading ? '—' : slots.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Horários/dia</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#101d27] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {loading ? '—' : days.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Dias ativos</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#101d27] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                {loading ? '—' : upcoming.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Próximos slots</div>
            </div>
          </div>
        </div>

        {/* Sistema de fila Card */}
        <div className="bg-white dark:bg-[#101d27] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Sistema de fila</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina os horários e dias para publicar automaticamente.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 mb-3.5">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Nenhum slot configurado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5">
                Defina os horários e dias para publicar automaticamente.
              </p>
              <button
                type="button"
                onClick={addSlot}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar slot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#6046ff]" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {String(slot.hour).padStart(2, '0')}:{String(slot.minute).padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover horário ${i + 1}`}
                      onClick={() => removeSlot(i)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSlot}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6046ff] hover:text-[#5036e6] pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar outro horário
              </button>
            </div>
          )}
        </div>

        {/* Configurações Card */}
        <div className="bg-white dark:bg-[#101d27] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Configurações</h2>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#6046ff] hover:bg-[#5036e6] disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>

          {saved && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Configurações salvas com sucesso!
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Fuso horário
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#6046ff] focus:outline-none"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (BRT -03:00)</option>
                <option value="America/New_York">America/New_York (EDT -04:00)</option>
                <option value="America/Chicago">America/Chicago (CDT -05:00)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PDT -07:00)</option>
                <option value="Europe/London">Europe/London (BST +01:00)</option>
                <option value="Europe/Madrid">Europe/Madrid (CEST +02:00)</option>
                <option value="Europe/Lisbon">Europe/Lisbon (WEST +01:00)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST +09:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Máx. posts por slot
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxPerSlot}
                onChange={(e) => setMaxPerSlot(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#6046ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Dias da semana
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, d) => {
                  const active = days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleDay(d)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                        active
                          ? 'bg-[#6046ff]/10 dark:bg-[#6046ff]/25 border-[#6046ff] text-[#6046ff] dark:text-[#a08fff]'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Horários
                </label>
                <button
                  type="button"
                  onClick={addSlot}
                  className="flex items-center gap-1 text-xs text-[#6046ff] hover:text-[#5036e6] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {slots.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">Nenhum horário configurado.</p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label={`Horário ${i + 1}`}
                        value={`${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`}
                        onChange={(e) => {
                          const [h, m] = e.target.value.split(':').map(Number);
                          updateSlot(i, 'hour', h);
                          updateSlot(i, 'minute', m);
                        }}
                        className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#6046ff] focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label={`Remover horário ${i + 1}`}
                        onClick={() => removeSlot(i)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
