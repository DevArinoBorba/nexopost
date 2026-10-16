'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import ProfileSwitcher from './ProfileSwitcher';
import BrandLogo from './BrandLogo';
import {
  Home,
  Upload,
  Calendar,
  BarChart3,
  Users,
  Sparkles,
  MessageCircle,
  Eye,
  Layers,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  onToggle?: () => void;
}

const navigation = [
  { name: 'Painel', href: '/dashboard', icon: Home },
  { name: 'Publicar', href: '/upload', icon: Upload },
  { name: 'Agendamentos', href: '/schedule', icon: Calendar },
  { name: 'Fila', href: '/queue', icon: Layers },
  { name: 'Métricas', href: '/analytics', icon: BarChart3 },
  { name: 'Audiência', href: '/audience', icon: Eye },
  { name: 'Contas', href: '/accounts', icon: Users },
  { name: 'Estúdio IA & Vídeo', href: '/ai-shorts', icon: Sparkles },
  { name: 'AutoDM', href: '/autodm', icon: MessageCircle },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 h-20 border-b border-slate-200 dark:border-slate-800">
            <Link href="/dashboard" aria-label="NexoPost" className="flex items-center">
              <BrandLogo size="md" />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cliente (perfil) */}
          <ProfileSwitcher />

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-9 h-9 bg-slate-900 dark:bg-brand-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {user?.name || 'Usuário'}
                  </p>
                  {user?.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email || (user?.plan === 'free' ? 'Plano Gratuito' : user?.plan || 'Gratuito')}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair da conta
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed top-4 left-4 z-40 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 lg:hidden"
      >
        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
      </button>
    </>
  );
}
