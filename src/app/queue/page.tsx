'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Queue" subtitle="Fila de publicação do servidor próprio" />
        <main className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-8">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Sistema de fila</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Defina horários e dias para publicar automaticamente. Próximo slot:{' '}
                {upcoming[0] ? new Date(upcoming[0].datetime_utc).toLocaleString('pt-BR') : '—'}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                  <Layers className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : slots.length}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Horários/dia</div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : days.length}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Dias ativos</div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : upcoming.length}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Próximos slots</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upcoming */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próximos slots</h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />
                  {timezone}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : upcoming.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">Nenhum slot configurado.</p>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {upcoming.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                        <Clock className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {new Date(s.datetime_utc).toLocaleString('pt-BR', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-slate-500">{s.timezone}</p>
                      </div>
                      <Link
                        href="/upload"
                        className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                        title="Agendar um post"
                      >
                        <Plus className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Configurações</h2>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>

              {saved && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
                  Configurações salvas!
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fuso horário</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    {Array.from(new Set([timezone, ...TIMEZONES])).map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Máx. posts por slot</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxPerSlot}
                    onChange={(e) => setMaxPerSlot(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dias da semana</label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_LABELS.map((label, d) => (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          days.includes(d)
                            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Horários</label>
                    <button onClick={addSlot} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {slots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={`${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`}
                          onChange={(e) => {
                            const [h, m] = e.target.value.split(':').map(Number);
                            updateSlot(i, 'hour', h);
                            updateSlot(i, 'minute', m);
                          }}
                          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                        <button onClick={() => removeSlot(i)} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {slots.length === 0 && <p className="text-sm text-slate-400">Nenhum horário configurado.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
