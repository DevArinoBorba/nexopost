'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Moon, Sun, Plus } from 'lucide-react';
import { backend } from '@/lib/client';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

interface Notification {
  id: string;
  message: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    // Notificações derivadas dos posts recentes (falhas / publicados)
    backend
      .getPosts(10)
      .then((d) => {
        const list: Notification[] = [];
        for (const p of d.posts || []) {
          for (const t of p.targets) {
            if (t.status === 'failed') {
              list.push({ id: `${p.id}-${t.platform}`, message: `Falha ao publicar "${p.title || 'post'}" no ${t.platform}` });
            } else if (t.status === 'published') {
              list.push({ id: `${p.id}-${t.platform}`, message: `Publicado "${p.title || 'post'}" no ${t.platform}` });
            }
          }
        }
        setNotifications(list.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {title ? (
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg" />
              <span className="font-bold text-slate-900 dark:text-white">UploadPost</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Publicar
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Notificações</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">Sem notificações.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <p className="text-sm text-slate-900 dark:text-white">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
