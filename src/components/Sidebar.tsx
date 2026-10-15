'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import ProfileSwitcher from './ProfileSwitcher';
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
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Queue', href: '/queue', icon: Layers },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Audience', href: '/audience', icon: Eye },
  { name: 'Accounts', href: '/accounts', icon: Users },
  { name: 'AI Shorts', href: '/ai-shorts', icon: Sparkles },
  { name: 'AutoDM', href: '/autodm', icon: MessageCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 z-50 bg-black/50" />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">UploadPost</span>
            </Link>
            <button
              onClick={() => setIsCollapsed(false)}
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
                  key={item.name}
                  href={item.href}
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
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.plan || 'Free'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg lg:hidden"
      >
        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
      </button>
    </>
  );
}
