'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type PostView, type ConnectedAccount } from '@/lib/client';
import {
  Upload,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Loader2,
  Layers,
  ListVideo,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [postsRes, accRes] = await Promise.allSettled([backend.getPosts(50), backend.getAccounts()]);
        if (postsRes.status === 'fulfilled') setPosts(postsRes.value.posts || []);
        if (accRes.status === 'fulfilled') setAccounts(accRes.value.accounts || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const published = posts.filter((p) => p.status === 'published').length;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const failed = posts.filter((p) => p.status === 'failed').length;

  const stats = [
    { label: 'Total de posts', value: posts.length, icon: ListVideo },
    { label: 'Publicados', value: published, icon: CheckCircle },
    { label: 'Agendados', value: scheduled, icon: Clock },
    { label: 'Falhas', value: failed, icon: XCircle },
  ];

  const recentPosts = posts.slice(0, 6);

  const statusBadge = (status: string) => {
    if (status === 'published')
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Publicado
        </span>
      );
    if (status === 'scheduled')
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded-full">
          <Clock className="w-3 h-3" />
          Agendado
        </span>
      );
    if (status === 'failed')
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 rounded-full">
          <XCircle className="w-3 h-3" />
          Falhou
        </span>
      );
    return (
      <span className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-full">
        Rascunho
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Dashboard" subtitle="Servidor próprio" />
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Novo upload
            </Link>
            <Link
              href="/schedule"
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Calendar className="w-4 h-4" />
              Agendamentos
            </Link>
            <Link
              href="/accounts"
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
              Conectar conta
            </Link>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg w-fit mb-3">
                  <stat.icon className="w-5 h-5 text-brand-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent posts */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Posts recentes</h3>
                <Link href="/schedule" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Ver todos
                </Link>
              </div>
              <div className="space-y-3">
                {loading && (
                  <div className="flex justify-center py-8 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {!loading && recentPosts.length === 0 && (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    Nenhum post ainda.{' '}
                    <Link href="/upload" className="text-brand-600 underline">
                      Faça seu primeiro upload
                    </Link>
                    .
                  </p>
                )}
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {post.title || '(sem título)'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {post.targets.map((t) => (
                          <PlatformIcon key={t.platform} platform={t.platform} size="sm" />
                        ))}
                        <span className="text-xs text-slate-500 ml-1">
                          {new Date(post.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    {statusBadge(post.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* Connected accounts */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Contas conectadas</h3>
                <Link href="/accounts" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Gerenciar
                </Link>
              </div>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div key={account.platform} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={account.platform} size="md" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white capitalize">
                          {account.display_name || account.platform}
                        </p>
                        <p className="text-xs text-slate-500">{account.handle || account.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-xs text-emerald-600">Conectada</span>
                    </div>
                  </div>
                ))}
                {!loading && accounts.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500">Nenhuma conta conectada.</p>
                  </div>
                )}
              </div>
              <Link
                href="/accounts"
                className="block w-full mt-4 py-2.5 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-500 hover:border-brand-500 hover:text-brand-600 transition-colors"
              >
                + Conectar nova conta
              </Link>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Layers className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Este app roda 100% no seu servidor (SQLite local). Nenhum dado é enviado ao upload-post.com.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
