'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { backend } from '@/lib/client';
import { ChevronDown, Building2, Plus, Check, Loader2 } from 'lucide-react';

interface ProfileItem {
  id: string;
  username: string;
  account_count: number;
  platforms: string[];
}

export default function ProfileSwitcher() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backend.getProfiles();
      setProfiles(data.profiles || []);
      const cookie = backend.getActiveProfileCookie();
      const exists = data.profiles?.some((p) => p.id === cookie);
      if (!exists && data.profiles?.length) {
        backend.setActiveProfile(data.profiles[0].id);
        setActiveId(data.profiles[0].id);
      } else {
        setActiveId(cookie);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = profiles.find((p) => p.id === activeId) || profiles[0];

  const switchTo = (id: string) => {
    backend.setActiveProfile(id);
    setActiveId(id);
    setOpen(false);
    router.refresh();
    // Recarrega para refletir os dados do cliente escolhido
    window.location.reload();
  };

  const createClient = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await backend.createProfile(newName.trim());
      setNewName('');
      setCreating(false);
      await load();
      if (res.profile?.id) switchTo(res.profile.id);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {loading ? '...' : active?.username || 'default'}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => switchTo(p.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.username}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {p.account_count} conta(s)
                    {p.platforms.length ? ` · ${p.platforms.join(', ')}` : ''}
                  </p>
                </div>
                {p.id === activeId && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {creating ? (
            <div className="p-2 border-t border-slate-200 dark:border-slate-700">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createClient()}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setCreating(false)}
                  className="flex-1 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={createClient}
                  disabled={busy}
                  className="flex-1 py-1.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center justify-center gap-1"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Criar'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 text-sm text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
