'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type PostView, type ConnectedAccount } from '@/lib/client';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Loader2,
  ListVideo,
  Users,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  FileVideo,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') {
    return (
      <span className="inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
        Publicado
      </span>
    );
  }
  if (status === 'scheduled') {
    return (
      <span className="inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
        Agendado
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
        Falha
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
      Rascunho
    </span>
  );
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [postResult, accountResult] = await Promise.allSettled([
      backend.getPosts(500),
      backend.getAccounts(),
    ]);
    if (postResult.status === 'fulfilled') setPosts(postResult.value.posts || []);
    if (accountResult.status === 'fulfilled') setAccounts(accountResult.value.accounts || []);
    if (postResult.status === 'rejected' || accountResult.status === 'rejected') {
      setError('Não foi possível carregar todos os dados do painel.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - period + 1);
    return posts.filter((post) => new Date(post.created_at) >= start);
  }, [posts, period]);

  const chartData = useMemo(() => {
    const localDate = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const counts = new Map<string, number>();
    for (const post of filteredPosts) {
      const key = localDate(new Date(post.created_at));
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from({ length: period }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - period + 1 + index);
      const dayCount = counts.get(localDate(date)) || 0;
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        posts: dayCount,
      };
    });
  }, [filteredPosts, period]);

  const totalCount = filteredPosts.length;
  const publishedCount = filteredPosts.filter((p) => p.status === 'published').length;
  const scheduledCount = filteredPosts.filter((p) => p.status === 'scheduled').length;
  const failedCount = filteredPosts.filter((p) => p.status === 'failed').length;

  return (
    <AppShell title="Painel" subtitle="Visão geral do seu servidor">
      {/* Top Bar with Period Dropdown & Refresh */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          className="nexo-icon-button"
          onClick={load}
          disabled={loading}
          aria-label="Atualizar dados do painel"
          title="Atualizar"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
        <div className="relative inline-block">
          <select
            aria-label="Período do painel"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="appearance-none bg-white dark:bg-[#111923] border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-1.5 pr-8 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6046ff]"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <ChevronDown
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={load} className="underline font-semibold ml-2">
            Tentar novamente
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total de posts */}
        <div className="nexo-panel p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de posts</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#6046ff] dark:text-[#a08fff] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '—' : totalCount}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={12} />
              <span>+12%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Publicados */}
        <div className="nexo-panel p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Publicados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '—' : publishedCount}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={12} />
              <span>+8%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Agendados */}
        <div className="nexo-panel p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Agendados</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '—' : scheduledCount}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Na fila de disparo
            </div>
          </div>
        </div>

        {/* Card 4: Falhas */}
        <div className="nexo-panel p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Falhas</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {loading ? '—' : failedCount}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              <TrendingDown size={12} />
              <span>-2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Chart: Desempenho de publicações */}
      <section className="nexo-panel p-5 sm:p-6 mb-6" aria-label="Desempenho de publicações">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Desempenho de publicações</h2>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPeriod(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  period === d
                    ? 'bg-white dark:bg-[#111923] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>

        <div className="h-[210px] w-full mt-2" style={{ height: 210, minHeight: 210 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <Loader2 size={20} className="animate-spin mr-2" />
              Carregando gráfico...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 10, bottom: 0, left: -26 }}>
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6046ff" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6046ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nexo-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--nexo-muted)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--nexo-muted)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0b1721] dark:bg-white text-white dark:text-[#0b1721] px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#6046ff]" />
                          <span>{data.posts} posts</span>
                          <span className="opacity-75 font-normal text-[11px]">{data.date}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="posts"
                  stroke="#6046ff"
                  strokeWidth={2.5}
                  fill="url(#purpleGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Bottom 2 Columns: Posts Recentes & Contas Conectadas */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column: Posts recentes */}
        <section className="nexo-panel p-5 sm:p-6" aria-label="Posts recentes">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Posts recentes</h2>
            <Link
              href="/schedule"
              className="text-xs font-semibold text-[#6046ff] dark:text-[#a08fff] hover:underline"
            >
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <Loader2 size={18} className="animate-spin mx-auto mb-2" />
              Carregando posts recentes...
            </div>
          ) : posts.length === 0 ? (
            <div className="py-10 text-center">
              <ListVideo size={28} className="mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Nenhum post recente</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Crie seu primeiro post agora mesmo.</p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                <Plus size={13} />
                Publicar post
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {posts.slice(0, 5).map((post) => {
                const dateStr = post.scheduled_at || post.created_at;
                const formattedDate = dateStr
                  ? new Date(dateStr).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <div key={post.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-slate-200/80 dark:border-slate-800">
                        {post.media_type === 'video' ? (
                          <FileVideo size={18} className="text-slate-400" />
                        ) : (
                          <ListVideo size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {post.title || 'Sem título'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                          <span>{formattedDate}</span>
                          {post.targets?.length > 0 && (
                            <div className="flex items-center gap-1 ml-1">
                              {post.targets.map((t) => (
                                <PlatformIcon key={t.platform} platform={t.platform} size="sm" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={post.status} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Contas conectadas */}
        <section className="nexo-panel p-5 sm:p-6" aria-label="Contas conectadas">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Contas conectadas</h2>
            <Link
              href="/accounts"
              className="text-xs font-semibold text-[#6046ff] dark:text-[#a08fff] hover:underline"
            >
              Gerenciar
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <Loader2 size={18} className="animate-spin mx-auto mb-2" />
              Carregando contas...
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={28} className="mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Nenhuma conta conectada</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Conecte Instagram, YouTube, TikTok ou Facebook.</p>
              <Link
                href="/accounts"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                <Plus size={13} />
                Conectar conta
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {['instagram', 'facebook', 'tiktok', 'youtube'].map((plat) => {
                const acc = accounts.find((a) => a.platform === plat);
                const isConnected = Boolean(acc);
                const displayName = acc?.display_name || acc?.handle || (plat === 'youtube' ? 'Canal YouTube' : plat);
                return (
                  <div key={plat} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        <PlatformIcon platform={plat} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {isConnected ? displayName : plat.charAt(0).toUpperCase() + plat.slice(1)}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {isConnected ? acc?.handle || `@${acc?.display_name?.toLowerCase().replace(/\s+/g, '')}` : 'Não vinculada'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Conectada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                          Desconectada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

