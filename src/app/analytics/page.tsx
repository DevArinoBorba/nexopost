'use client';

import { useEffect, useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type PostView } from '@/lib/client';
import { TrendingUp, CheckCircle, Clock, XCircle, Download, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await backend.getPosts(500);
        setPosts(data.posts || []);
      } catch {
        setError('Não foi possível carregar as métricas. Recarregue a página para tentar novamente.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const published = posts.filter((p) => p.status === 'published').length;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const failed = posts.filter((p) => p.status === 'failed').length;

  const stats = [
    { label: 'Posts totais', value: posts.length, icon: TrendingUp },
    { label: 'Publicados', value: published, icon: CheckCircle },
    { label: 'Agendados', value: scheduled, icon: Clock },
    { label: 'Falhas', value: failed, icon: XCircle },
  ];

  // Posts por plataforma (a partir dos destinos)
  const perPlatform = useMemo(() => {
    const map: Record<string, { platform: string; publicados: number; falhas: number }> = {};
    for (const post of posts) {
      for (const t of post.targets) {
        const key = t.platform;
        if (!map[key]) map[key] = { platform: key.charAt(0).toUpperCase() + key.slice(1), publicados: 0, falhas: 0 };
        if (t.status === 'published') map[key].publicados += 1;
        if (t.status === 'failed') map[key].falhas += 1;
      }
    }
    return Object.values(map);
  }, [posts]);

  // Distribuição por status (pizza)
  const statusData = useMemo(
    () => [
      { name: 'Publicados', value: published },
      { name: 'Agendados', value: scheduled },
      { name: 'Falhas', value: failed },
      { name: 'Rascunhos', value: posts.length - published - scheduled - failed },
    ].filter((d) => d.value > 0),
    [published, scheduled, failed, posts.length]
  );

  // Últimos 30 dias por dia
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const p of posts) {
      const day = p.created_at.slice(0, 10);
      if (map.has(day)) map.set(day, (map.get(day) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, posts: count }));
  }, [posts]);

  const successRate = posts.length ? Math.round((published / posts.length) * 100) : 0;

  return (
    <AppShell title="Métricas" subtitle="Desempenho de publicações do seu servidor">
          {error && <p role="alert" className="mb-4 p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg">{error}</p>}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-slate-500">
              Estatísticas de publicação próprias. Métricas externas (views, likes) exigem as APIs de analytics de cada
              rede — próximos passos.
            </p>
            <button
              onClick={() => {
                const csv = [
                  ['Métrica', 'Valor'],
                  ...stats.map((s) => [s.label, String(s.value)]),
                  ['Taxa de sucesso', `${successRate}%`],
                ]
                  .map((r) => r.join(','))
                  .join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'analytics.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="shrink-0 flex items-center gap-2 px-4 py-2 nexo-panel rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="p-5 nexo-panel">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg w-fit mb-3">
                  <stat.icon className="w-5 h-5 text-brand-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="p-6 nexo-panel">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Posts por plataforma</h3>
              <div className="h-64">
                {perPlatform.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perPlatform}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--nexo-border)" />
                      <XAxis dataKey="platform" stroke="var(--nexo-muted)" fontSize={12} />
                      <YAxis stroke="var(--nexo-muted)" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--nexo-surface)', border: '1px solid var(--nexo-border)', borderRadius: '8px', color: 'var(--nexo-text)' }} />
                      <Bar dataKey="publicados" fill="var(--nexo-accent)" radius={[4, 4, 0, 0]} name="Publicados" />
                      <Bar dataKey="falhas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Falhas" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    {loading ? 'Carregando...' : 'Sem dados'}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 nexo-panel">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Distribuição por status</h3>
              <div className="h-64">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--nexo-surface)', border: '1px solid var(--nexo-border)', borderRadius: '8px', color: 'var(--nexo-text)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    {loading ? 'Carregando...' : 'Sem dados'}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 nexo-panel">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Posts publicados por dia (30 dias)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-3 font-medium">Dia</th>
                    <th className="pb-3 font-medium text-right">Posts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {byDay
                    .filter((d) => d.posts > 0)
                    .reverse()
                    .slice(0, 10)
                    .map((d) => (
                      <tr key={d.date} className="text-sm">
                        <td className="py-3 text-slate-600 dark:text-slate-400">
                          {new Date(d.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 text-right text-slate-600 dark:text-slate-400">{d.posts}</td>
                      </tr>
                    ))}
                  {byDay.every((d) => d.posts === 0) && (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-sm text-slate-500">
                        {loading ? 'Carregando...' : 'Nenhum post no período'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AppShell>
  );
}
