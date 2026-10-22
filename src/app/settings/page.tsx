'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { backend, type UserAccountView, type SessionView, type BrandProfileView, type ApiKeyView } from '@/lib/client';
import {
  User,
  Users,
  Key,
  Palette,
  Server,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Lock,
  Shield,
  Plus,
  Trash2,
  LogIn,
  RefreshCw,
  Laptop,
  Building2,
  Phone,
  Mail,
  Brain,
  Sparkles,
  MapPin,
  Target,
  Award,
  Megaphone,
  Ban,
  Wand2,
  Copy,
  Terminal,
} from 'lucide-react';

type Tab = 'profile' | 'brand' | 'users' | 'api' | 'appearance' | 'server';

export default function SettingsPage() {
  const { refresh: refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const { theme, setTheme: applyTheme } = useTheme();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Dados da própria conta (/api/auth/me)
  const [me, setMe] = useState<UserAccountView | null>(null);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Cérebro da Marca (Brand Context) vinculado ao Perfil
  const [brandProfilesList, setBrandProfilesList] = useState<{ id: string; username: string }[]>([]);
  const [selectedBrandProfileId, setSelectedBrandProfileId] = useState<string>('');
  const [selectedBrandProfileName, setSelectedBrandProfileName] = useState<string>('');
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState<Omit<BrandProfileView, 'profile_id' | 'updated_at'>>({
    company_name: '',
    niche: '',
    location: '',
    target_audience: '',
    unique_selling_points: '',
    tone: '',
    default_cta: '',
    rules_to_avoid: '',
  });
  const [brandUpdatedAt, setBrandUpdatedAt] = useState<string>('');
  const [testBrandTopic, setTestBrandTopic] = useState<string>('');
  const [testingBrandAi, setTestingBrandAi] = useState<boolean>(false);
  const [testBrandResult, setTestBrandResult] = useState<{
    title: string;
    description: string;
    callToAction?: string;
    hashtags: string[];
  } | null>(null);

  // Alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Gestão de usuários (/api/users)
  const [users, setUsers] = useState<UserAccountView[]>([]);
  const [canManageUsers, setCanManageUsers] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newUserPlan, setNewUserPlan] = useState('pro');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Chaves de API (Hermes & REST v1)
  const [apiKeys, setApiKeys] = useState<ApiKeyView[]>([]);
  const [apiProfiles, setApiProfiles] = useState<{ id: string; username: string }[]>([]);
  const [selectedApiProfileId, setSelectedApiProfileId] = useState<string>('');
  const [newApiKeyName, setNewApiKeyName] = useState<string>('');
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [generatedRawToken, setGeneratedRawToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const showSuccess = (msg: string) => {
    setError('');
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const loadBrand = useCallback(async (profileId?: string) => {
    setLoadingBrand(true);
    try {
      const data = await backend.getBrandProfile(profileId);
      setBrandProfilesList(data.profiles || []);
      setSelectedBrandProfileId(data.profile.id);
      setSelectedBrandProfileName(data.profile.username);
      setBrandForm({
        company_name: data.brandProfile?.company_name || '',
        niche: data.brandProfile?.niche || '',
        location: data.brandProfile?.location || '',
        target_audience: data.brandProfile?.target_audience || '',
        unique_selling_points: data.brandProfile?.unique_selling_points || '',
        tone: data.brandProfile?.tone || '',
        default_cta: data.brandProfile?.default_cta || '',
        rules_to_avoid: data.brandProfile?.rules_to_avoid || '',
      });
      setBrandUpdatedAt(data.brandProfile?.updated_at || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingBrand(false);
    }
  }, []);

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backend.getMe();
      setMe(data.user);
      setSessions(data.sessions || []);
      setName(data.user.name || '');
      setEmail(data.user.email || '');
      setCompany(data.user.company || '');
      setPhone(data.user.phone || '');
      setProfileName(data.profile?.username || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await backend.getUsers();
      setUsers(data.users || []);
      setCanManageUsers(data.canManage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadApiKeys = useCallback(async () => {
    setLoadingApiKeys(true);
    try {
      const data = await backend.getApiKeys();
      setApiKeys(data.apiKeys || []);
      setApiProfiles(data.profiles || []);
      setSelectedApiProfileId((prev) => prev || data.activeProfile?.id || data.profiles?.[0]?.id || '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingApiKeys(false);
    }
  }, []);

  useEffect(() => {

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as Tab | null;
      if (tabParam && ['profile', 'brand', 'users', 'api', 'appearance', 'server'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
    loadMe();
    loadUsers();
    loadBrand();
    loadApiKeys();
  }, [loadMe, loadUsers, loadBrand, loadApiKeys]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingApiKey(true);
    setError('');
    try {
      const profName = apiProfiles.find((p) => p.id === selectedApiProfileId)?.username || 'Cliente';
      const res = await backend.createApiKey({
        profile_id: selectedApiProfileId || undefined,
        name: newApiKeyName.trim() || `Hermes Agent - ${profName}`,
      });
      setApiKeys(res.apiKeys || []);
      setGeneratedRawToken(res.rawToken);
      setNewApiKeyName('');
      showSuccess(`Chave de API criada para o perfil "${profName}"! Copie o token abaixo.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleRevokeApiKey = async (k: ApiKeyView) => {
    if (!confirm(`Deseja revogar a chave "${k.name}" (${k.key_prefix})?`)) return;
    setError('');
    try {
      const res = await backend.revokeApiKey(k.id);
      setApiKeys(res.apiKeys || []);
      showSuccess('Chave de API revogada.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSaveBrandProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    setError('');
    try {
      const res = await backend.saveBrandProfile({
        profile_id: selectedBrandProfileId || undefined,
        ...brandForm,
      });
      setBrandUpdatedAt(res.brandProfile.updated_at);
      showSuccess(`Cérebro da Marca do perfil "${res.profile.username}" salvo com sucesso!`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleTestBrandAi = async () => {
    const topic = testBrandTopic.trim() || `Apresentação e dica rápida sobre ${brandForm.niche || 'nosso serviço'}`;
    setTestingBrandAi(true);
    setError('');
    try {
      // Salva primeiro para garantir que o banco esteja atualizado com o formulário atual
      await backend.saveBrandProfile({
        profile_id: selectedBrandProfileId || undefined,
        ...brandForm,
      });
      const res = await backend.generateAICopy({
        topic,
        platform: 'instagram',
        profile_id: selectedBrandProfileId || undefined,
      });
      if (res.success && res.data) {
        setTestBrandResult(res.data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTestingBrandAi(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    try {
      const res = await backend.updateMe({
        name,
        email,
        company,
        phone,
        profileName,
      });
      setMe(res.user);
      await refreshAuth();
      await loadUsers();
      showSuccess('Dados da conta atualizados com sucesso!');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }
    setSavingPassword(true);
    try {
      await backend.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Senha alterada com sucesso!');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await backend.revokeSession(sessionId);
      await loadMe();
      showSuccess('Sessão encerrada.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const res = await backend.revokeOtherSessions();
      await loadMe();
      showSuccess(`${res.removed} outra(s) sessão(ões) encerrada(s).`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setError('');
    try {
      const res = await backend.createUserAccount({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        company: newUserCompany || undefined,
        initialProfileName: newUserCompany || 'Principal',
        plan: newUserPlan,
        role: newUserRole,
      });
      setUsers(res.users);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserCompany('');
      setShowCreateUser(false);
      showSuccess(`Conta criada para ${res.user.name} (${res.user.email})!`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUserField = async (
    id: string,
    patch: { plan?: string; role?: 'admin' | 'user'; status?: 'active' | 'suspended'; newPassword?: string }
  ) => {
    setBusyUserId(id);
    setError('');
    try {
      const res = await backend.updateUserAccount({ id, ...patch });
      setUsers(res.users);
      if (id === me?.id) {
        await loadMe();
        await refreshAuth();
      }
      if (patch.newPassword) {
        setResetPasswordUserId(null);
        setResetPasswordValue('');
        showSuccess('Senha do usuário redefinida com sucesso!');
      } else {
        showSuccess('Conta de usuário atualizada!');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteUser = async (u: UserAccountView) => {
    if (!confirm(`Tem certeza que deseja excluir a conta de "${u.name}" (${u.email}) e todos os seus dados?`)) return;
    setBusyUserId(u.id);
    setError('');
    try {
      const res = await backend.deleteUserAccount(u.id);
      setUsers(res.users);
      showSuccess(`Conta de ${u.name} removida.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSwitchUser = async (u: UserAccountView) => {
    setBusyUserId(u.id);
    setError('');
    try {
      await backend.switchUserAccount(u.id);
      await refreshAuth();
      window.location.href = '/dashboard';
    } catch (e) {
      setError((e as Error).message);
      setBusyUserId(null);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Minha Conta & Segurança', icon: User },
    { id: 'brand', label: 'Cérebro da Marca (IA)', icon: Brain },
    { id: 'users', label: `Contas de Usuários (${users.length || 1})`, icon: Users },
    { id: 'api', label: 'API', icon: Key },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'server', label: 'Servidor', icon: Server },
  ];

  const setTheme = (mode: 'light' | 'dark' | 'system') => {
    applyTheme(mode);
    showSuccess('Tema de aparência salvo!');
  };

  return (
    <AppShell title="Configurações" subtitle="Gerencie sua conta, usuários reais, segurança e servidor" className="nexo-main-focused">
          {/* Navegação por abas */}
          <div className="flex items-center gap-2 p-1.5 nexo-panel mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab);
                  setError('');
                }}
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

          {notice && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ABA 1: MINHA CONTA & SEGURANÇA */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="nexo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold">
                      {name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {me?.name || 'Minha Conta'}
                        </h2>
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 capitalize">
                          {me?.plan || 'free'}
                        </span>
                        {me?.role === 'admin' && (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            Administrador
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{me?.email}</p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Nome completo
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Email de acesso
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Empresa / Agência
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Nome da sua empresa ou agência"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Telefone / WhatsApp
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+55 (00) 90000-0000"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Nome do Cliente (Perfil Ativo)
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Plano atual
                        </label>
                        <input
                          readOnly
                          value={
                            me?.plan === 'agency'
                              ? 'Agência (Ilimitado)'
                              : me?.plan === 'pro'
                              ? 'Profissional'
                              : 'Gratuito'
                          }
                          className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar alterações
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Alterar senha */}
              <div className="nexo-panel p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Segurança e Senha</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Atualize a senha de acesso da sua conta (armazenada com hash scrypt + salt)
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="grid sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Senha atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Senha atual (ou em branco se padrão)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Nova senha (mín. 6 caracteres)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirmar nova senha
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500 text-white rounded-xl text-sm font-semibold whitespace-nowrap transition-colors"
                      >
                        {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Sessões ativas */}
              <div className="nexo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Sessões Ativas ({sessions.length})
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dispositivos autenticados nesta conta
                      </p>
                    </div>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleRevokeOtherSessions}
                      className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-colors"
                    >
                      Encerrar outras sessões
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <p className="text-sm text-slate-500 py-3">
                    Sessão local ativa. Faça login em <code className="font-mono">/login</code> para registrar cookie de sessão persistente.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-md">
                              {s.user_agent}
                            </p>
                            {s.is_current && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
                                Sessão atual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            IP: {s.ip_address} · Expira em {new Date(s.expires_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {!s.is_current && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(s.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            Encerrar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: CONTAS DE USUÁRIOS (MULTI-USUÁRIOS REAIS) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="nexo-panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Contas Reais de Usuários ({users.length})
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Cada usuário possui seus próprios clientes (perfis), contas sociais OAuth, fila e agendamentos isolados.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadUsers}
                      className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                      title="Atualizar lista"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                    </button>
                    {canManageUsers && (
                      <button
                        type="button"
                        onClick={() => setShowCreateUser((v) => !v)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Novo Usuário
                      </button>
                    )}
                  </div>
                </div>

                {/* Formulário para criar novo usuário real */}
                {showCreateUser && (
                  <form
                    onSubmit={handleCreateUser}
                    className="mb-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4"
                  >
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-brand-600" />
                      Cadastrar nova conta de usuário
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Ex.: Maria Silva"
                          required
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="maria@empresa.com"
                          required
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Senha inicial *
                        </label>
                        <input
                          type="text"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                          minLength={6}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Empresa / Cliente inicial
                        </label>
                        <input
                          type="text"
                          value={newUserCompany}
                          onChange={(e) => setNewUserCompany(e.target.value)}
                          placeholder="Ex.: Cliente ou Marca"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Plano
                        </label>
                        <select
                          value={newUserPlan}
                          onChange={(e) => setNewUserPlan(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                        >
                          <option value="free">Gratuito</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Profissional</option>
                          <option value="agency">Agência</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Permissão
                        </label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                        >
                          <option value="user">Usuário</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateUser(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={creatingUser}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold"
                      >
                        {creatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Criar Conta
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de usuários reais */}
                {loadingUsers ? (
                  <div className="flex justify-center py-10 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((u) => {
                      const isCurrent = u.id === me?.id;
                      const isResetting = resetPasswordUserId === u.id;
                      return (
                        <div
                          key={u.id}
                          className={`p-4 rounded-2xl border transition-colors ${
                            isCurrent
                              ? 'border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-[220px]">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-brand-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {u.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                    {u.name}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 rounded-full">
                                      Você
                                    </span>
                                  )}
                                  {u.status === 'suspended' && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full">
                                      Suspenso
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {u.email}
                                  {u.company ? ` · ${u.company}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Estatísticas de uso real da conta */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                              <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                                <strong className="text-slate-900 dark:text-white">{u.profile_count ?? 0}</strong> cliente(s)
                              </div>
                              <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                                <strong className="text-slate-900 dark:text-white">{u.account_count ?? 0}</strong> rede(s)
                              </div>
                              <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                                <strong className="text-slate-900 dark:text-white">{u.post_count ?? 0}</strong> post(s)
                              </div>
                            </div>

                            {/* Controles administrativos */}
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={u.plan || 'free'}
                                disabled={!canManageUsers || busyUserId === u.id}
                                onChange={(e) => handleUpdateUserField(u.id, { plan: e.target.value })}
                                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                                title="Plano"
                              >
                                <option value="free">Plano Gratuito</option>
                                <option value="starter">Plano Starter</option>
                                <option value="pro">Plano Pro</option>
                                <option value="agency">Plano Agência</option>
                              </select>

                              <select
                                value={u.role || 'user'}
                                disabled={!canManageUsers || busyUserId === u.id}
                                onChange={(e) =>
                                  handleUpdateUserField(u.id, { role: e.target.value as 'admin' | 'user' })
                                }
                                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                                title="Permissão"
                              >
                                <option value="user">Usuário</option>
                                <option value="admin">Admin</option>
                              </select>

                              {canManageUsers && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetPasswordUserId(isResetting ? null : u.id);
                                    setResetPasswordValue('');
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                                  title="Redefinir senha"
                                >
                                  Senha
                                </button>
                              )}

                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleSwitchUser(u)}
                                  disabled={busyUserId === u.id || u.status === 'suspended'}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 rounded-lg transition-colors"
                                  title="Entrar com esta conta"
                                >
                                  <LogIn className="w-3.5 h-3.5" />
                                  Acessar
                                </button>
                              )}

                              {canManageUsers && !isCurrent && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateUserField(u.id, {
                                      status: u.status === 'suspended' ? 'active' : 'suspended',
                                    })
                                  }
                                  disabled={busyUserId === u.id}
                                  className="px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                                >
                                  {u.status === 'suspended' ? 'Reativar' : 'Suspender'}
                                </button>
                              )}

                              {canManageUsers && !isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={busyUserId === u.id}
                                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                  title="Excluir usuário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Barra rápida para redefinir senha deste usuário */}
                          {isResetting && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={resetPasswordValue}
                                onChange={(e) => setResetPasswordValue(e.target.value)}
                                placeholder="Nova senha para este usuário (mín. 6 caracteres)"
                                className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateUserField(u.id, { newPassword: resetPasswordValue })
                                }
                                disabled={resetPasswordValue.length < 6 || busyUserId === u.id}
                                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold"
                              >
                                Salvar nova senha
                              </button>
                              <button
                                type="button"
                                onClick={() => setResetPasswordUserId(null)}
                                className="px-2.5 py-1.5 text-xs text-slate-500"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: CÉREBRO DA MARCA (BRAND CONTEXT) */}
          {activeTab === 'brand' && (
            <div className="space-y-6">
              <div className="nexo-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Cérebro da Marca (Brand Context)
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Configure a identidade, público-alvo, diferenciais, CTA padrão e regras do perfil ativo. O{' '}
                        <b className="text-violet-600 dark:text-violet-400">Google Gemini</b> injeta automaticamente
                        esse contexto em todos os títulos, roteiros e legendas gerados.
                      </p>
                    </div>
                  </div>

                  {/* Seletor de Perfil (Cliente) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Perfil:</span>
                    <select
                      value={selectedBrandProfileId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setSelectedBrandProfileId(nextId);
                        loadBrand(nextId);
                      }}
                      className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      {brandProfilesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingBrand ? (
                  <div className="flex justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveBrandProfile} className="space-y-5">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          <Building2 className="w-4 h-4 inline mr-1 text-brand-500" />
                          Nome da Empresa / Marca
                        </label>
                        <input
                          type="text"
                          value={brandForm.company_name}
                          onChange={(e) => setBrandForm((prev) => ({ ...prev, company_name: e.target.value }))}
                          placeholder="Ex: Clínica OdontoPrime / NexoPost"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          <Sparkles className="w-4 h-4 inline mr-1 text-violet-500" />
                          Nicho / Segmento
                        </label>
                        <input
                          type="text"
                          value={brandForm.niche}
                          onChange={(e) => setBrandForm((prev) => ({ ...prev, niche: e.target.value }))}
                          placeholder="Ex: Odontologia Estética, SaaS de Marketing, Fitness..."
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          <MapPin className="w-4 h-4 inline mr-1 text-emerald-500" />
                          Localização / Abrangência
                        </label>
                        <input
                          type="text"
                          value={brandForm.location}
                          onChange={(e) => setBrandForm((prev) => ({ ...prev, location: e.target.value }))}
                          placeholder="Ex: São Paulo - SP / Atendimento Nacional"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          <Target className="w-4 h-4 inline mr-1 text-indigo-500" />
                          Público-Alvo (Persona, Dores e Desejos)
                        </label>
                        <textarea
                          rows={3}
                          value={brandForm.target_audience}
                          onChange={(e) => setBrandForm((prev) => ({ ...prev, target_audience: e.target.value }))}
                          placeholder="Ex: Empreendedores, criadores de conteúdo e gestores de tráfego de 22 a 45 anos que querem escalar vídeos curtos sem perder horas editando e agendando..."
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none resize-y"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          <Award className="w-4 h-4 inline mr-1 text-amber-500" />
                          Diferenciais Únicos (USPs)
                        </label>
                        <textarea
                          rows={3}
                          value={brandForm.unique_selling_points}
                          onChange={(e) =>
                            setBrandForm((prev) => ({ ...prev, unique_selling_points: e.target.value }))
                          }
                          placeholder="Ex: Atendimento humanizado em 5 minutos, garantia de 12 meses, tecnologia própria sem mensalidades abusivas..."
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none resize-y"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Tom de Voz da Marca
                        </label>
                        <input
                          type="text"
                          value={brandForm.tone}
                          onChange={(e) => setBrandForm((prev) => ({ ...prev, tone: e.target.value }))}
                          placeholder="Ex: Autoridade acessível, direto ao ponto, energético e confiável"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {[
                            'Autoridade acessível e didático',
                            'Jovem, dinâmico e provocativo',
                            'Sofisticado, premium e consultivo',
                            'Direto ao ponto, focado em ROI e resultados',
                          ].map((presetTone) => (
                            <button
                              key={presetTone}
                              type="button"
                              onClick={() => setBrandForm((prev) => ({ ...prev, tone: presetTone }))}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              + {presetTone}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          <Megaphone className="w-4 h-4 inline mr-1 text-brand-500" />
                          Chamada para Ação (CTA) Padrão
                        </label>
                        <input
                          type="text"
                          value={brandForm.default_cta}
                          onChange={(e) => setBrandForm((prev) => ({ ...prev, default_cta: e.target.value }))}
                          placeholder="Ex: Comente QUERO que te envio o link de diagnóstico no Direct!"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1.5">
                          A IA priorizará esta chamada no final das legendas e nos gatilhos de AutoDM.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <Ban className="w-4 h-4 inline mr-1 text-rose-500" />
                        Regras de Ouro / O que Evitar (Restrições para a IA)
                      </label>
                      <textarea
                        rows={2}
                        value={brandForm.rules_to_avoid}
                        onChange={(e) => setBrandForm((prev) => ({ ...prev, rules_to_avoid: e.target.value }))}
                        placeholder="Ex: Nunca prometa ganhos fáceis; não use gírias infantis; evite textos genéricos estilo robô; nunca cite concorrentes..."
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none resize-y"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500">
                        {brandUpdatedAt
                          ? `Última atualização do perfil "${selectedBrandProfileName}": ${new Date(
                              brandUpdatedAt
                            ).toLocaleString('pt-BR')}`
                          : `Nenhum contexto salvo ainda para o perfil "${selectedBrandProfileName}".`}
                      </span>

                      <button
                        type="submit"
                        disabled={savingBrand}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Cérebro da Marca
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Simulador Rápido: Testar o Cérebro da Marca com Gemini IA */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-violet-200 dark:border-violet-900/60 p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Testar Cérebro da Marca na Prática
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Digite um tema simples e veja como o Gemini IA responde já aplicando o contexto da marca acima.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={testBrandTopic}
                    onChange={(e) => setTestBrandTopic(e.target.value)}
                    placeholder="Ex: Por que a maioria das empresas perde clientes no atendimento pelo WhatsApp..."
                    className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={testingBrandAi}
                    onClick={handleTestBrandAi}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    {testingBrandAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando com Contexto...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Testar IA com Marca
                      </>
                    )}
                  </button>
                </div>

                {testBrandResult && (
                  <div className="mt-4 p-4 nexo-panel space-y-2.5">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        Título Gerado
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {testBrandResult.title}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        Legenda Personalizada com Identidade da Marca
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line mt-1">
                        {testBrandResult.description}
                        {testBrandResult.callToAction ? `\n\n${testBrandResult.callToAction}` : ''}
                        {testBrandResult.hashtags?.length ? `\n\n${testBrandResult.hashtags.join(' ')}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 3: API & INTEGRAÇÃO HERMES */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* Gerenciamento de Chaves de API (Hermes & REST v1) */}
              <div className="nexo-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        Chaves de API por Cliente (Agente Hermes & REST v1)
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Gere uma chave exclusiva (<code className="font-mono">nex_live_...</code>) para cada cliente/perfil. O Agente Hermes usa essa chave para agendar, publicar e consultar métricas daquele cliente com isolamento total.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulário para gerar nova chave */}
                <form
                  onSubmit={handleCreateApiKey}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-6"
                >
                  <div className="grid sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Cliente (Perfil no NexoPost)
                      </label>
                      <select
                        value={selectedApiProfileId}
                        onChange={(e) => setSelectedApiProfileId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                      >
                        {apiProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.username}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Identificação da Chave
                      </label>
                      <input
                        type="text"
                        value={newApiKeyName}
                        onChange={(e) => setNewApiKeyName(e.target.value)}
                        placeholder="Ex.: Hermes Agent - Gordinho Locações"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={creatingApiKey}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        {creatingApiKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Gerar Chave de API
                      </button>
                    </div>
                  </div>
                </form>

                {/* Exibição única do token recém-gerado */}
                {generatedRawToken && (
                  <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Chave gerada — copie agora (exibida apenas uma vez)
                      </span>
                      <button
                        type="button"
                        onClick={() => setGeneratedRawToken(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white select-all overflow-x-auto">
                        {generatedRawToken}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyToken(generatedRawToken)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0"
                      >
                        {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedToken ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de chaves ativas */}
                {loadingApiKeys ? (
                  <div className="flex justify-center py-8 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Nenhuma chave de API gerada ainda. Selecione um cliente acima e clique em <b>Gerar Chave de API</b>.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {k.name}
                            </span>
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded-full">
                              Cliente: {k.profile_name || k.profile_id}
                            </span>
                            <code className="px-2 py-0.5 text-xs font-mono bg-slate-200/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded">
                              {k.key_prefix}
                            </code>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Criada em {new Date(k.created_at).toLocaleString('pt-BR')} ·{' '}
                            {k.last_used_at
                              ? `Último uso: ${new Date(k.last_used_at).toLocaleString('pt-BR')}`
                              : 'Nunca utilizada'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeApiKey(k)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revogar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Endpoints /api/v1/* (Autenticados via Bearer nex_live_...) */}
              <div className="nexo-panel p-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <Terminal className="w-5 h-5 text-brand-500" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    API Externa v1 (Hermes MCP & Automação)
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Autentique com o cabeçalho <code className="font-mono">Authorization: Bearer nex_live_...</code>
                </p>
                <div className="space-y-3 text-sm mb-6">
                  {[
                    ['POST', '/api/v1/publish', 'Agenda ou publica vídeo/foto/texto no perfil da chave (multipart, local_media_path ou media_url)'],
                    ['GET', '/api/v1/accounts', 'Lista redes sociais conectadas, seguidores e Cérebro da Marca do cliente'],
                    ['GET/DELETE', '/api/v1/schedule', 'Lista a fila de agendamentos do cliente ou cancela um post agendado (?id=...)'],
                    ['GET', '/api/v1/audience', 'Retorna métricas consolidadas de seguidores, alcance e crescimento do cliente'],
                  ].map(([method, path, desc]) => (
                    <div key={path} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded">
                        {method}
                      </span>
                      <code className="text-xs text-slate-900 dark:text-white flex-1">{path}</code>
                      <span className="text-xs text-slate-500">{desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  API Interna do Painel (Sessão Web)
                </h3>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['GET/POST/DELETE', '/api/api-keys', 'Geração, listagem e revogação de chaves de API por perfil'],
                    ['GET/PATCH/DELETE', '/api/auth/me', 'Dados da conta logada, senha e sessões'],
                    ['GET/POST/PATCH/DELETE', '/api/users', 'Gestão de contas reais de usuários'],
                    ['GET/PUT', '/api/brand-profile', 'Cérebro da Marca (Brand Context) vinculado ao perfil'],
                    ['POST', '/api/ai/generate', 'Geração de copy/roteiro Gemini IA com Cérebro da Marca'],
                    ['GET/POST/PATCH/DELETE', '/api/profiles', 'Gestão de clientes (perfis) do usuário'],
                    ['GET/POST/DELETE', '/api/accounts', 'Lista, sincroniza OAuth e desconecta contas sociais'],
                    ['POST', '/api/publish', 'Publica/agenda (multipart)'],
                    ['GET', '/api/posts', 'Lista posts e status'],
                    ['GET', '/api/schedule', 'Lista agendados'],
                    ['PATCH/DELETE', '/api/schedule/:id', 'Reagenda ou cancela agendamento'],
                    ['GET/POST', '/api/queue', 'Configurações de fila'],
                    ['GET/POST', '/api/scheduler/run', 'Processa agendados vencidos'],
                    ['GET/POST', '/api/ffmpeg', 'Processamento FFmpeg'],
                    ['GET', '/api/audience', 'Dados de audiência e seguidores das contas'],
                    ['GET/POST/DELETE', '/api/autodm', 'Regras e histórico de AutoDM'],
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
            </div>
          )}

          {/* ABA 4: APARÊNCIA */}
          {activeTab === 'appearance' && (
            <div className="nexo-panel p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Aparência</h2>
              <h4 className="font-medium text-slate-900 dark:text-white mb-3">Tema</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  aria-pressed={theme === 'light'} onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="w-full h-16 bg-white border border-slate-200 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Claro</span>
                </button>
                <button
                  aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="w-full h-16 bg-slate-900 border border-slate-700 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Escuro</span>
                </button>
                <button
                  aria-pressed={theme === 'system'} onClick={() => setTheme('system')}
                  className={`p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <div className="w-full h-16 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sistema</span>
                </button>
              </div>
            </div>
          )}

          {/* ABA 5: SERVIDOR */}
          {activeTab === 'server' && (
            <div className="nexo-panel p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Servidor</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Este app roda inteiramente no seu servidor. Nenhum dado vai para terceiros.
              </p>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span>Banco de dados</span>
                  <span className="font-medium text-slate-900 dark:text-white">SQLite local (./data/app.db)</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span>Autenticação de usuários</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    Sessões HttpOnly + Hash scrypt (Multi-usuário ativo)
                  </span>
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
        </AppShell>
  );
}
