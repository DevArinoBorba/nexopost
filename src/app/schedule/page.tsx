'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type ScheduledPostView } from '@/lib/client';
import {
  Calendar,
  Clock,
  FileVideo,
  Image as ImageIcon,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Pencil,
  Layers,
  RefreshCw,
  Plus,
} from 'lucide-react';

const typeIcon: Record<string, typeof FileText> = {
  video: FileVideo,
  photo: ImageIcon,
  text: FileText,
};

export default function SchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [posts, setPosts] = useState<ScheduledPostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduledPostView | null>(null);
  const [editDate, setEditDate] = useState('');
  const [publishedCount, setPublishedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [schedRes, postsRes] = await Promise.allSettled([backend.getSchedule(), backend.getPosts()]);
      if (schedRes.status === 'fulfilled') {
        setPosts(schedRes.value.scheduled_posts || []);
      }
      if (postsRes.status === 'fulfilled') {
        const list = postsRes.value.posts || [];
        setPublishedCount(list.filter((p) => p.status === 'published').length);
        setFailedCount(list.filter((p) => p.status === 'failed').length);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const postsOnDate = (d: Date) =>
    posts.filter((p) => p.scheduled_date && new Date(p.scheduled_date).toDateString() === d.toDateString());

  const cancelPost = async (id: string) => {
    if (!confirm('Cancelar este post agendado?')) return;
    setBusy(id);
    setError('');
    try {
      await backend.cancelSchedule(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (post: ScheduledPostView) => {
    setEditing(post);
    const d = new Date(post.scheduled_date);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(editing.job_id);
    setError('');
    try {
      await backend.reschedule(editing.job_id, new Date(editDate).toISOString());
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const visiblePosts = selectedDate ? postsOnDate(selectedDate) : posts;

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');

  return (
    <AppShell title="Agendamentos" subtitle="Calendário e fila de posts agendados">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Calendar Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(null);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#111923] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            Hoje
          </button>
          <div className="flex items-center gap-1">
            <button
              aria-label="Mês anterior"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Próximo mês"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
            {monthYear}
          </h2>
        </div>

        {/* View Switcher: Mês / Semana / Lista */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
          {(['month', 'week', 'list'] as const).map((mode) => {
            const labels = { month: 'Mês', week: 'Semana', list: 'Lista' };
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#0b1721] text-white dark:bg-white dark:text-[#0b1721] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Main Calendar View (Col-span 8) */}
        <div className="lg:col-span-8 nexo-panel p-5 sm:p-6">
          {viewMode === 'list' ? (
            /* List Mode View */
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {posts.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-400">Nenhum post agendado na fila.</p>
              ) : (
                posts.map((post) => (
                  <div key={post.job_id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <FileVideo size={16} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {post.title || 'Sem título'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(post.scheduled_date).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(post)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        title="Reagendar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => cancelPost(post.job_id)}
                        className="p-1.5 text-slate-400 hover:text-red-500"
                        title="Cancelar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Month / Week Grid View */
            <>
              <div className="grid grid-cols-7 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-200/50 dark:bg-slate-800/60 gap-[1px]">
                {days.map((date, idx) => {
                  const dayPosts = date ? postsOnDate(date) : [];
                  const count = dayPosts.length;
                  const isCurrentDay = date && isToday(date);
                  const isSelected = date && selectedDate && selectedDate.toDateString() === date.toDateString();

                  // Extrai plataformas únicas dos posts do dia
                  const dayPlatforms = Array.from(
                    new Set(dayPosts.flatMap((p) => p.platforms || []))
                  );

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!date}
                      onClick={() => date && setSelectedDate(isSelected ? null : date)}
                      className={`min-h-[82px] p-2 flex flex-col justify-between text-left transition-colors bg-white dark:bg-[#111923] ${
                        !date
                          ? 'bg-slate-50/50 dark:bg-[#0c141d]/50'
                          : isSelected
                          ? 'ring-2 ring-inset ring-[#6046ff] bg-[#f0edff]/30 dark:bg-[#1d2440]/40'
                          : 'hover:bg-slate-50 dark:hover:bg-[#14202d]'
                      }`}
                    >
                      {date && (
                        <>
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`text-xs font-semibold ${
                                isCurrentDay
                                  ? 'w-5 h-5 rounded-full bg-[#6046ff] text-white flex items-center justify-center text-[10px]'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {date.getDate()}
                            </span>
                          </div>

                          {count > 0 && (
                            <div className="mt-1">
                              <span className="block text-[10px] font-bold text-[#6046ff] dark:text-[#a08fff]">
                                {count} {count === 1 ? 'post' : 'posts'}
                              </span>
                              <div className="flex items-center gap-1 mt-1">
                                {dayPlatforms.slice(0, 4).map((plat) => {
                                  const dotColors: Record<string, string> = {
                                    instagram: 'bg-[#e4405f]',
                                    youtube: 'bg-[#ff0000]',
                                    facebook: 'bg-[#1877f2]',
                                    tiktok: 'bg-slate-900 dark:bg-white',
                                  };
                                  return (
                                    <span
                                      key={plat}
                                      className={`w-1.5 h-1.5 rounded-full ${dotColors[plat] || 'bg-[#6046ff]'}`}
                                      title={plat}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar (Col-span 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Próximos Agendados */}
          <div className="nexo-panel p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedDate
                  ? `Posts em ${selectedDate.toLocaleDateString('pt-BR')}`
                  : 'Próximos Agendados'}
              </h3>
              <Link
                href="/schedule"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-[#6046ff] dark:text-[#a08fff] hover:underline"
              >
                Ver todos
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                Carregando posts...
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Calendar size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                Nenhum post agendado para esta seleção.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {visiblePosts.slice(0, 4).map((post) => {
                  const d = new Date(post.scheduled_date);
                  const timeFormatted = `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                  return (
                    <div key={post.job_id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-slate-200/80 dark:border-slate-800">
                        {post.post_type === 'video' ? (
                          <FileVideo size={16} className="text-slate-400" />
                        ) : (
                          <Calendar size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold text-slate-400">
                          {timeFormatted}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {post.title || 'Sem título'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {post.platforms?.map((plat) => (
                            <PlatformIcon key={plat} platform={plat} size="sm" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(post)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="Reagendar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => cancelPost(post.job_id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                          title="Cancelar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href="/upload"
              className="mt-4 w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111923] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus size={14} />
              Agendar novo post
            </Link>
          </div>

          {/* Card 2: Resumo do período */}
          <div className="nexo-panel p-5 sm:p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Resumo do período
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-slate-600 dark:text-slate-400">Posts agendados</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{posts.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">Publicados</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {publishedCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-600 dark:text-slate-400">Com falha</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {failedCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {editing && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setEditing(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Reagendar post</h3>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nova data/hora</label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none mb-6"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={busy !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
