'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await backend.getSchedule();
      setPosts(data.scheduled_posts || []);
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

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Schedule" subtitle="Calendário e fila de posts agendados" />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Total na fila de agendamento: <b className="text-slate-900 dark:text-white">{posts.length}</b> post(s)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-sm transition-all"
              >
                <Layers className="w-3.5 h-3.5" />
                Novo Upload / Fila em Massa
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">{monthYear}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(null);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                  >
                    Hoje
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((date, idx) => {
                  const dayPosts = date ? postsOnDate(date) : [];
                  const count = dayPosts.length;
                  return (
                    <button
                      key={idx}
                      onClick={() => date && setSelectedDate(date)}
                      disabled={!date}
                      className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${
                        !date
                          ? ''
                          : isToday(date)
                          ? 'bg-brand-50 dark:bg-brand-900/30 ring-2 ring-brand-500'
                          : count > 0
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      } ${selectedDate?.toDateString() === date?.toDateString() ? 'ring-2 ring-brand-500' : ''}`}
                    >
                      {date && (
                        <>
                          <span
                            className={`font-medium ${
                              isToday(date) ? 'text-brand-600' : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {date.getDate()}
                          </span>
                          {count > 0 && (
                            <span className="mt-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-500 text-white leading-tight">
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[700px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {selectedDate ? selectedDate.toLocaleDateString('pt-BR') : 'Próximos Agendados'}
                </h2>
                <span className="px-2.5 py-1 text-xs font-bold bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full">
                  {visiblePosts.length}
                </span>
              </div>

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium mb-3 text-left"
                >
                  ← Ver todos ({posts.length})
                </button>
              )}

              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {loading ? (
                  <div className="flex justify-center py-8 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : visiblePosts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-3">Nenhum post agendado</p>
                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                    >
                      Agendar vídeos agora
                    </Link>
                  </div>
                ) : (
                  visiblePosts.map((post) => {
                    const Icon = typeIcon[post.post_type] || FileText;
                    return (
                      <div key={post.job_id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {new Date(post.scheduled_date).toLocaleString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {busy === post.job_id && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        </div>
                        <div className="flex items-start gap-2 mb-1.5">
                          <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-slate-900 dark:text-white line-clamp-2">
                              {post.title || '(sem título)'}
                            </p>
                            {post.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {post.description}
                              </p>
                            )}
                            {post.source_filename && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{post.source_filename}</p>
                            )}
                          </div>
                        </div>
                        {post.platforms?.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 mb-2">
                            {post.platforms.map((p) => (
                              <PlatformIcon key={p} platform={p} size="sm" />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => openEdit(post)}
                            disabled={busy !== null}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => cancelPost(post.job_id)}
                            disabled={busy !== null}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>
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
    </div>
  );
}
