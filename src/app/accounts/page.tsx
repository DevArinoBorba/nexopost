'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PlatformIcon from '@/components/PlatformIcon';
import { backend, type ConnectedAccount, type ProviderInfo } from '@/lib/client';
import {
  Users,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Settings2,
  RefreshCw,
  Building2,
  Facebook,
} from 'lucide-react';

interface ProfileItem {
  id: string;
  username: string;
  account_count: number;
  platforms: string[];
}

interface MetaPage {
  id: string;
  name: string;
  avatar?: string;
  instagram: { id: string; username?: string } | null;
}

function AccountsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [helpFor, setHelpFor] = useState<ProviderInfo | null>(null);

  // Seleção de Páginas do Meta (agência)
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [metaSession, setMetaSession] = useState<string | null>(null);
  const [showPages, setShowPages] = useState(false);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});
  const [loadingPages, setLoadingPages] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, profs] = await Promise.all([backend.getAccounts(), backend.getProfiles()]);
      setAccounts(acc.accounts);
      setProviders(acc.providers);
      setProfiles(profs.profiles || []);
      const cookie = backend.getActiveProfileCookie();
      setActiveProfileId(cookie || profs.profiles?.[0]?.id || null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPages = useCallback(async (session: string) => {
    setLoadingPages(true);
    setError('');
    try {
      const data = await backend.getMetaPages(session);
      setPages(data.pages || []);
      // atribui por padrão ao cliente ativo
      const cookie = backend.getActiveProfileCookie();
      const def: Record<string, string> = {};
      for (const p of data.pages || []) def[p.id] = cookie || '';
      setAssignTo(def);
      setShowPages(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingPages(false);
    }
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const err = searchParams.get('error');
    const session = searchParams.get('meta_session');
    if (connected) setNotice(`Conta ${connected} conectada com sucesso!`);
    if (err) setError(err);

    (async () => {
      await load();
      if (session) {
        setMetaSession(session);
        await loadPages(session);
      }
    })();
  }, [load, loadPages, searchParams]);

  const connect = (provider: ProviderInfo) => {
    if (!provider.configured) {
      setHelpFor(provider);
      return;
    }
    window.location.href = `/api/oauth/${provider.id}/start`;
  };

  const disconnect = async (platform: string) => {
    const profileId = activeProfile?.id;
    if (!profileId) return;
    if (!confirm(`Desconectar ${platform} deste cliente (${activeProfile.username})?`)) return;
    setBusy(platform);
    setError('');
    try {
      await backend.disconnectFromProfile(profileId, platform);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const connectPage = async (page: MetaPage) => {
    const profileId = assignTo[page.id];
    if (!profileId) {
      setError('Escolha o cliente para esta Página.');
      return;
    }
    setBusy(page.id);
    setError('');
    try {
      const platforms: string[] = ['facebook'];
      if (page.instagram) platforms.push('instagram');
      const res = await backend.connectMetaPage({ session: metaSession!, pageId: page.id, profileId, platforms });
      setNotice(`"${page.name}" conectada ao cliente "${res.profile.username}" (${res.connected.join(', ')})`);
      // remove da lista
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const isConnected = (id: string) => accounts.some((a) => a.platform === id);
  const availableProviders = providers.filter((p) => !isConnected(p.id));

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Accounts" subtitle="Contas conectadas por cliente" />
        <main className="p-4 sm:p-6 lg:p-8">
          {notice && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Cliente ativo */}
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">Cliente selecionado</p>
              <p className="font-semibold text-slate-900 dark:text-white">{activeProfile?.username || '—'}</p>
            </div>
            <p className="text-sm text-slate-500">
              {profiles.length} cliente(s) · use o seletor na barra lateral para trocar
            </p>
          </div>

          {/* Conectar Meta (agência) */}
          <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 mb-8">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Facebook className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Agência: conectar Páginas dos clientes</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Autorize <b>uma vez</b> com o Facebook. O sistema lista <b>todas</b> as Páginas que você administra e
                você escolhe para qual cliente vai cada uma.
              </p>
              <button
                onClick={() => {
                  const p = providers.find((x) => x.id === 'facebook');
                  if (p) connect(p);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Autorizar e escolher Páginas
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '—' : accounts.length}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Contas deste cliente</div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{profiles.length}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Clientes</div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Settings2 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {providers.filter((p) => !p.configured).length}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Sem credenciais</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contas conectadas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Contas de {activeProfile?.username}
              </h2>
              <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-1">Nenhuma conta conectada para este cliente</p>
                <p className="text-sm text-slate-500 mb-4">Use o botão azul acima para conectar as Páginas dele.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => (
                  <div key={account.platform} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <PlatformIcon platform={account.platform} size="lg" showName />
                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-medium text-emerald-600">Ativa</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      {account.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={account.avatar_url} alt={account.display_name || account.platform} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{account.display_name || account.platform}</p>
                        <p className="text-xs text-slate-500 truncate">{account.handle || ''}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => disconnect(account.platform)}
                      disabled={busy !== null}
                      className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors border-t border-slate-100 dark:border-slate-800 pt-3"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover deste cliente
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outras plataformas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Conectar plataformas diretas</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {providers.map((provider) => {
                const connected = isConnected(provider.id);
                return (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-xl border-2 ${
                      connected ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <PlatformIcon platform={provider.id} size="md" />
                      {connected ? <Check className="w-5 h-5 text-emerald-500" /> : provider.configured ? <Plus className="w-5 h-5 text-slate-400" /> : <Settings2 className="w-5 h-5 text-amber-500" />}
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-white mb-1">{provider.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">
                      {connected ? 'Conectada' : provider.configured ? 'Pronta para conectar' : 'Falta configurar credenciais'}
                    </p>
                    {!connected && (
                      <button
                        onClick={() => connect(provider)}
                        className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                          provider.configured
                            ? 'text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300'
                            : 'text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300'
                        }`}
                      >
                        {provider.configured ? 'Conectar' : 'Como configurar'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal: escolher Páginas e atribuir a clientes */}
          {showPages && (
            <>
              <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowPages(false)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Escolha as Páginas por cliente</h3>
                    <button onClick={() => setShowPages(false)} className="p-2 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Encontramos {pages.length} Página(s). Para cada uma, escolha o cliente e clique em Conectar.
                  </p>

                  {loadingPages ? (
                    <div className="flex justify-center py-10 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : pages.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      Nenhuma Página encontrada (ou todas já conectadas).
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pages.map((page) => (
                        <div key={page.id} className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                          {page.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={page.avatar} alt={page.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                          )}
                          <div className="flex-1 min-w-[160px]">
                            <p className="font-medium text-slate-900 dark:text-white">{page.name}</p>
                            <p className="text-xs text-slate-500">
                              {page.instagram ? `Instagram: @${page.instagram.username || page.instagram.id}` : 'Sem Instagram vinculado'}
                            </p>
                          </div>
                          <select
                            value={assignTo[page.id] || ''}
                            onChange={(e) => setAssignTo((prev) => ({ ...prev, [page.id]: e.target.value }))}
                            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                          >
                            <option value="">Escolher cliente…</option>
                            {profiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.username}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => connectPage(page)}
                            disabled={busy === page.id || !assignTo[page.id]}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                          >
                            {busy === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Conectar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Ajuda de configuração */}
          {helpFor && (
            <>
              <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setHelpFor(null)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configurar {helpFor.name}</h3>
                    <button onClick={() => setHelpFor(null)} className="p-2 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Crie um app de desenvolvedor na plataforma e cole as credenciais no{' '}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env.local</code>, depois reinicie o
                    servidor.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <AccountsContent />
    </Suspense>
  );
}
