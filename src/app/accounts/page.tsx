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
  Edit3,
  ShieldCheck,
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

const PROVIDER_SETUP_GUIDES: Record<
  string,
  {
    consoleUrl: string;
    redirectUri: string;
    envKeys: string[];
    steps: string[];
  }
> = {
  youtube: {
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    redirectUri: 'http://localhost:3000/api/oauth/youtube/callback',
    envKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    steps: [
      'No Google Cloud Console, ative a API "YouTube Data API v3".',
      'Crie uma credencial "ID do cliente OAuth 2.0" do tipo Aplicativo da Web.',
      'Adicione a URI de redirecionamento abaixo nas URIs autorizadas.',
      'Copie o Client ID e Client Secret para o seu arquivo .env.local.',
    ],
  },
  facebook: {
    consoleUrl: 'https://developers.facebook.com/apps',
    redirectUri: 'http://localhost:3000/api/oauth/facebook/callback',
    envKeys: ['META_CLIENT_ID', 'META_CLIENT_SECRET', 'FACEBOOK_REDIRECT_URI'],
    steps: [
      'No Meta for Developers, crie um App do tipo Empresa (Business).',
      'Adicione o produto "Login do Facebook para Empresas" e configure a URI de redirecionamento abaixo.',
      'Habilite as permissões pages_show_list, pages_read_engagement e pages_manage_posts.',
      'Copie o ID do Aplicativo e a Chave Secreta para o .env.local.',
    ],
  },
  instagram: {
    consoleUrl: 'https://developers.facebook.com/apps',
    redirectUri: 'http://localhost:3000/api/oauth/instagram/callback',
    envKeys: ['META_CLIENT_ID', 'META_CLIENT_SECRET', 'INSTAGRAM_REDIRECT_URI', 'MEDIA_PUBLIC_URL'],
    steps: [
      'Vincule sua conta Instagram Profissional (Business/Creator) a uma Página do Facebook.',
      'No mesmo App Meta, adicione as permissões instagram_basic e instagram_content_publish.',
      'Defina MEDIA_PUBLIC_URL no .env.local com seu domínio HTTPS ou túnel público (ex.: cloudflared).',
    ],
  },
  tiktok: {
    consoleUrl: 'https://developers.tiktok.com/apps',
    redirectUri: 'http://localhost:3000/api/oauth/tiktok/callback',
    envKeys: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
    steps: [
      'No TikTok Developer Portal, crie um app e adicione "Login Kit" e "Content Posting API".',
      'Ative os escopos user.info.basic, video.publish e video.upload.',
      'Adicione a URI de redirecionamento abaixo no Login Kit e cole Client Key e Client Secret no .env.local.',
    ],
  },
};

function AccountsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [helpFor, setHelpFor] = useState<ProviderInfo | null>(null);

  // Gestão rápida de clientes (perfis)
  const [newClientName, setNewClientName] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const syncRealAccounts = async (platform?: string) => {
    setSyncing(true);
    setError('');
    setNotice('');
    try {
      const res = await backend.syncAccounts(platform);
      setAccounts(res.accounts);
      const okCount = res.results.filter((r) => r.ok).length;
      const fail = res.results.find((r) => !r.ok);
      if (fail && okCount === 0) {
        setError(`Falha ao validar ${fail.platform}: ${fail.error}`);
      } else {
        setNotice(
          `${okCount} conta(s) sincronizada(s) com dados reais da API oficial${
            fail ? ` (${fail.platform}: ${fail.error})` : '!'
          }`
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
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
      setNotice(`Conta ${platform} removida de ${activeProfile.username}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSwitchProfile = (id: string) => {
    backend.setActiveProfile(id);
    setActiveProfileId(id);
    window.location.reload();
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setCreatingClient(true);
    setError('');
    try {
      const res = await backend.createProfile(newClientName.trim());
      setNewClientName('');
      await load();
      if (res.profile?.id) handleSwitchProfile(res.profile.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleRenameClient = async (id: string) => {
    if (!renameValue.trim()) return;
    setError('');
    try {
      await backend.renameProfile(id, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
      await load();
      setNotice('Nome do cliente atualizado!');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDeleteClient = async (p: ProfileItem) => {
    if (!confirm(`Remover o cliente "${p.username}" e desconectar suas contas?`)) return;
    setError('');
    try {
      await backend.deleteProfile(p.id);
      const remaining = profiles.filter((x) => x.id !== p.id);
      if (activeProfileId === p.id && remaining[0]) {
        backend.setActiveProfile(remaining[0].id);
      }
      await load();
      setNotice(`Cliente "${p.username}" removido.`);
    } catch (e) {
      setError((e as Error).message);
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
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const isConnected = (id: string) => accounts.some((a) => a.platform === id);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Contas & Clientes" subtitle="Conecte e sincronize contas reais por cliente" />
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

          {/* Gestão de Clientes (Perfis) do Usuário */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cliente ativo selecionado</p>
                  <p className="font-bold text-slate-900 dark:text-white">{activeProfile?.username || '—'}</p>
                </div>
              </div>

              <form onSubmit={handleCreateClient} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Novo cliente / marca..."
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={creatingClient || !newClientName.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {creatingClient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Adicionar Cliente
                </button>
              </form>
            </div>

            {/* Pílulas de clientes */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {profiles.map((p) => {
                const isAct = p.id === activeProfile?.id;
                if (renamingId === p.id) {
                  return (
                    <div key={p.id} className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameClient(p.id)}
                        className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameClient(p.id)}
                        className="px-2 py-1 text-xs bg-brand-600 text-white rounded-lg"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="px-1.5 py-1 text-xs text-slate-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isAct
                        ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <button type="button" onClick={() => handleSwitchProfile(p.id)} className="flex items-center gap-1.5">
                      <span className="font-semibold">{p.username}</span>
                      <span className="text-[11px] opacity-75">({p.account_count})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameValue(p.username);
                      }}
                      className="opacity-60 hover:opacity-100"
                      title="Renomear cliente"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(p)}
                        className="opacity-60 hover:opacity-100 text-red-500"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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
                você escolhe para qual cliente vai cada uma (conectando Facebook e Instagram Business juntos).
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
                  <div className="text-sm text-slate-500 dark:text-slate-400">Clientes na sua conta</div>
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
                    {providers.filter((p) => p.configured).length}/{providers.length}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Provedores configurados</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contas conectadas */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Contas reais conectadas em {activeProfile?.username}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tokens criptografados no banco local com renovação automática OAuth
                </p>
              </div>
              <div className="flex items-center gap-2">
                {accounts.length > 0 && (
                  <button
                    onClick={() => syncRealAccounts()}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <ShieldCheck className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
                    {syncing ? 'Sincronizando com APIs...' : 'Sincronizar dados reais'}
                  </button>
                )}
                <button
                  onClick={load}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-1">Nenhuma conta conectada para este cliente</p>
                <p className="text-sm text-slate-500 mb-4">
                  Use o botão azul acima ou escolha uma das plataformas abaixo para autorizar via OAuth.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => {
                  const followers = Number(account.meta?.followers || 0);
                  const views = Number(account.meta?.views || 0);
                  const isExpired = account.token_status === 'expired';
                  return (
                    <div
                      key={account.platform}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <PlatformIcon platform={account.platform} size="lg" showName />
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                              isExpired
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-600'
                                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : 'bg-emerald-500'}`}
                            />
                            <span className="text-xs font-medium">
                              {isExpired ? 'Reconectar' : 'Ativa'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          {account.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={account.avatar_url}
                              alt={account.display_name || account.platform}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                              {(account.display_name || account.platform).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {account.display_name || account.platform}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{account.handle || account.external_id}</p>
                          </div>
                        </div>

                        {(followers > 0 || views > 0) && (
                          <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                            {followers > 0 && (
                              <span>
                                <strong>{followers.toLocaleString('pt-BR')}</strong> seguidores/inscritos
                              </span>
                            )}
                            {views > 0 && (
                              <span>
                                · <strong>{views.toLocaleString('pt-BR')}</strong> views
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1">
                        <button
                          onClick={() => syncRealAccounts(account.platform)}
                          disabled={syncing || busy !== null}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Sincronizar
                        </button>
                        <button
                          onClick={() => disconnect(account.platform)}
                          disabled={busy !== null}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                      connected
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <PlatformIcon platform={provider.id} size="md" />
                      {connected ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : provider.configured ? (
                        <Plus className="w-5 h-5 text-slate-400" />
                      ) : (
                        <Settings2 className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-white mb-1">{provider.name}</h3>
                    <p className="text-xs text-slate-500 mb-3">
                      {connected
                        ? 'Conectada neste cliente'
                        : provider.configured
                        ? 'Pronta para conectar'
                        : 'Falta configurar credenciais'}
                    </p>
                    <div className="flex gap-2">
                      {!connected ? (
                        <button
                          onClick={() => connect(provider)}
                          className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                            provider.configured
                              ? 'text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300'
                              : 'text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          {provider.configured ? 'Conectar via OAuth' : 'Como configurar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => connect(provider)}
                          className="w-full py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                        >
                          Reconectar / Trocar conta
                        </button>
                      )}
                    </div>
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
                        <div
                          key={page.id}
                          className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
                        >
                          {page.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={page.avatar} alt={page.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                          )}
                          <div className="flex-1 min-w-[160px]">
                            <p className="font-medium text-slate-900 dark:text-white">{page.name}</p>
                            <p className="text-xs text-slate-500">
                              {page.instagram
                                ? `Instagram: @${page.instagram.username || page.instagram.id}`
                                : 'Sem Instagram vinculado'}
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

          {/* Ajuda detalhada de configuração OAuth */}
          {helpFor && (
            <>
              <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setHelpFor(null)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={helpFor.id} size="md" />
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Configurar OAuth — {helpFor.name}
                      </h3>
                    </div>
                    <button onClick={() => setHelpFor(null)} className="p-2 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {PROVIDER_SETUP_GUIDES[helpFor.id] ? (
                    <div className="space-y-4 text-sm">
                      <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
                        {PROVIDER_SETUP_GUIDES[helpFor.id].steps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ol>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">URI de Redirecionamento</p>
                        <code className="block p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-white break-all">
                          {PROVIDER_SETUP_GUIDES[helpFor.id].redirectUri}
                        </code>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Variáveis no arquivo .env.local
                        </p>
                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs overflow-x-auto">
                          {PROVIDER_SETUP_GUIDES[helpFor.id].envKeys.map((k) => `${k}=...`).join('\n')}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Crie um app de desenvolvedor na plataforma e cole as credenciais no{' '}
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.env.local</code>, depois reinicie o
                      servidor.
                    </p>
                  )}
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}
