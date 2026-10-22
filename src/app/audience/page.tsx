'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type AudienceResponse } from '@/lib/client';
import {
  Users,
  TrendingUp,
  Globe,
  Clock,
  Sparkles,
  RefreshCw,
  Loader2,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
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

export default function AudiencePage() {
  const [data, setData] = useState<AudienceResponse | null>(null);
  const [platform, setPlatform] = useState('all');
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await backend.getAudience(platform, period);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [platform, period]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSyncReal = async () => {
    setSyncing(true);
    try {
      await backend.syncAccounts();
      await load();
    } catch {
      // silencioso
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AppShell title="Audiência" subtitle="Demografia, seguidores reais e horários de pico do cliente ativo" className="space-y-6">
          {/* Barra superior de filtros e contas reais */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'Todas as Redes' },
                { id: 'instagram', label: 'Instagram' },
                { id: 'youtube', label: 'YouTube' },
                { id: 'facebook', label: 'Facebook' },
                { id: 'tiktok', label: 'TikTok' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    platform === p.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.id !== 'all' && <PlatformIcon platform={p.id} size="sm" />}
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { id: '7d', label: '7 dias' },
                  { id: '30d', label: '30 dias' },
                  { id: '90d', label: '90 dias' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setPeriod(pr.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      period === pr.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSyncReal}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-xl text-xs font-semibold hover:bg-brand-100 transition-colors"
                title="Sincronizar seguidores reais nas APIs oficiais"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar Contas
              </button>
            </div>
          </div>

          {/* Contas reais conectadas deste cliente */}
          {data?.realAccounts && data.realAccounts.length > 0 && (
            <div className="nexo-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Contas reais conectadas em {data.profile.username}
                </h3>
                <Link href="/accounts" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Gerenciar contas →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.realAccounts.map((acc) => (
                  <div
                    key={acc.platform}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                  >
                    {acc.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.avatar_url} alt={acc.display_name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <PlatformIcon platform={acc.platform} size="md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {acc.display_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {acc.followers > 0
                          ? `${acc.followers.toLocaleString('pt-BR')} seguidores`
                          : acc.handle || acc.platform}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading || !data ? (
            <div className="flex justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Cards de KPIs */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 nexo-panel">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">Base de Seguidores</span>
                    <Users className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {data.overview.followers.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />+{data.overview.growthPercent}% no período
                  </p>
                </div>

                <div className="p-5 nexo-panel">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">Novos Seguidores</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    +{data.overview.growth.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Crescimento líquido ({period})</p>
                </div>

                <div className="p-5 nexo-panel">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">Taxa de Engajamento</span>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {data.overview.engagementRate}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Interações por alcance</p>
                </div>

                <div className="p-5 nexo-panel">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">Alcance Estimado</span>
                    <Globe className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {data.overview.reach.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Contas únicas alcançadas</p>
                </div>
              </div>

              {/* Gráficos Demográficos: Faixa Etária & Gênero */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 nexo-panel p-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                    Distribuição por Faixa Etária (%)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.ageData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                        <XAxis dataKey="age" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="female" name="Feminino (%)" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="male" name="Masculino (%)" stackId="a" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="nexo-panel p-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Gênero</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.genderData}
                          dataKey="percentage"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                        >
                          {data.genderData.map((g, idx) => (
                            <Cell key={idx} fill={g.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {data.genderData.map((g) => (
                      <div key={g.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                          {g.name}
                        </span>
                        <strong className="text-slate-900 dark:text-white">{g.percentage}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Geografia + Melhores Horários */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="nexo-panel p-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    Principais Países e Cidades
                  </h3>
                  <div className="space-y-3 mb-6">
                    {data.topCountries.map((c) => (
                      <div key={c.code}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{c.country}</span>
                          <span className="text-slate-500">
                            {c.percentage}% ({c.followers.toLocaleString('pt-BR')})
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-600 rounded-full" style={{ width: `${c.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2.5">Top Cidades</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {data.topCities.map((ct) => (
                      <div
                        key={ct.city}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300 truncate">{ct.city}</span>
                        <strong className="text-slate-900 dark:text-white">{ct.percentage}%</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="nexo-panel p-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-600" />
                    Recomendações de Publicação
                  </h3>
                  <div className="space-y-3">
                    {data.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full">
                            {rec.tag}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">{rec.impact}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{rec.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </AppShell>
  );
}
