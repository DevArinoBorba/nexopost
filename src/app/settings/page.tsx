'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { User, Key, Palette, Server, Save, Loader2, Check } from 'lucide-react';

type Tab = 'profile' | 'api' | 'appearance' | 'server';

interface Config {
  user: { id: string; email: string; name: string; plan: string };
  profile: { id: string; username: string };
  selfHosted: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'api', label: 'API', icon: Key },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'server', label: 'Servidor', icon: Server },
  ];

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      localStorage.setItem('theme', 'system');
      setIsDark(prefersDark);
    } else {
      root.classList.toggle('dark', mode === 'dark');
      localStorage.setItem('theme', mode);
      setIsDark(mode === 'dark');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Configurações" subtitle="Configurações do servidor próprio" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {saved && (
            <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> Salvo
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Perfil</h2>
              {loading ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome</label>
                    <input
                      readOnly
                      value={config?.user.name || ''}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                    <input
                      readOnly
                      value={config?.user.email || ''}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Perfil</label>
                    <input
                      readOnly
                      value={config?.profile.username || ''}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Plano</label>
                    <input
                      readOnly
                      value={config?.user.plan || ''}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white capitalize"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">API interna</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Endpoints do seu próprio servidor. Use-os para integrar outras ferramentas.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  ['GET', '/api/accounts', 'Lista contas conectadas'],
                  ['POST', '/api/publish', 'Publica/agenda (multipart)'],
                  ['GET', '/api/posts', 'Lista posts e status'],
                  ['GET', '/api/schedule', 'Lista agendados'],
                  ['PATCH', '/api/schedule/:id', 'Reagenda'],
                  ['DELETE', '/api/schedule/:id', 'Cancela'],
                  ['GET/POST', '/api/queue', 'Configurações de fila'],
                  ['GET/POST', '/api/scheduler/run', 'Processa agendados vencidos'],
                  ['GET/POST', '/api/ffmpeg', 'Processamento FFmpeg'],
                  ['GET', '/api/oauth/youtube/start', 'Inicia OAuth do YouTube'],
                ].map(([method, path, desc]) => (
                  <div key={path} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded">
                      {method}
                    </span>
                    <code className="text-xs text-slate-900 dark:text-white flex-1">{path}</code>
                    <span className="text-xs text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Aparência</h2>
              <h4 className="font-medium text-slate-900 dark:text-white mb-3">Tema</h4>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 transition-all ${!isDark ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <div className="w-full h-16 bg-white border border-slate-200 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Claro</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 transition-all ${isDark ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <div className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Escuro</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all"
                >
                  <div className="w-full h-16 bg-gradient-to-r from-white to-slate-900 border border-slate-200 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sistema</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'server' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Servidor</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Este app roda inteiramente no seu servidor. Nenhum dado vai para o upload-post.com.
              </p>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span>Banco de dados</span>
                  <span className="font-medium text-slate-900 dark:text-white">SQLite local (./data/app.db)</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span>Mídia</span>
                  <span className="font-medium text-slate-900 dark:text-white">./data/media</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span>Tokens das redes</span>
                  <span className="font-medium text-slate-900 dark:text-white">Criptografados (AES-256-GCM)</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span>Processamento de vídeo</span>
                  <span className="font-medium text-slate-900 dark:text-white">FFmpeg local</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
