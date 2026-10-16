'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { backend, type UserAccountView, type SessionView } from '@/lib/client';
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
} from 'lucide-react';

type Tab = 'profile' | 'users' | 'api' | 'appearance' | 'server';

export default function SettingsPage() {
  const { refresh: refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
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

  const showSuccess = (msg: string) => {
    setError('');
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

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

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    loadMe();
    loadUsers();
  }, [loadMe, loadUsers]);

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
    { id: 'users', label: `Contas de Usuários (${users.length || 1})`, icon: Users },
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
    showSuccess('Tema de aparência salvo!');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header title="Configurações" subtitle="Gerencie sua conta, usuários reais, segurança e servidor" />
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Navegação por abas */}
          <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center text-xl font-bold">
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
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

          {/* ABA 3: API */}
          {activeTab === 'api' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">API interna</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Endpoints do seu próprio servidor. Use-os para integrar outras ferramentas.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  ['GET/PATCH/DELETE', '/api/auth/me', 'Dados da conta logada, senha e sessões'],
                  ['GET/POST/PATCH/DELETE', '/api/users', 'Gestão de contas reais de usuários'],
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
          )}

          {/* ABA 4: APARÊNCIA */}
          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Aparência</h2>
              <h4 className="font-medium text-slate-900 dark:text-white mb-3">Tema</h4>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    !isDark ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="w-full h-16 bg-white border border-slate-200 rounded-lg mb-2" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Claro</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isDark ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
                  }`}
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

          {/* ABA 5: SERVIDOR */}
          {activeTab === 'server' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
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
        </main>
      </div>
    </div>
  );
}
