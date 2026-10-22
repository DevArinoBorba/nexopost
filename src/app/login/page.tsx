'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Credenciais inválidas');
        return;
      }
      if (data.user) login(data.user);
      await refresh();
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fillOwnerAccount = () => {
    setEmail('arinoborba@gmail.com');
    setPassword('changeme');
    setError('');
  };

  return (
    <AuthLayout>
      <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Entrar</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Acesse sua conta NexoPost para gerenciar seus clientes e redes sociais
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="login-email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password" autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Mostrar ou ocultar senha"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="nexo-primary w-full py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na Conta'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Não tem conta?{' '}
              <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                Criar nova conta
              </Link>
            </p>
          </div>

          {/* Acesso rápido da conta principal */}
          <div className="mt-5 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                Conta Admin: <code className="font-mono">arinoborba@gmail.com</code>
              </p>
            </div>
            <button
              type="button"
              onClick={fillOwnerAccount}
              className="px-2.5 py-1 text-xs font-medium bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 rounded-lg hover:bg-brand-100 transition-colors flex-shrink-0"
            >
              Preencher
            </button>
          </div>
      </div>
    </AuthLayout>
  );
}
