'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import ProfileSwitcher from './ProfileSwitcher';
import BrandLogo from './BrandLogo';
import { Home, Upload, Calendar, BarChart3, Users, Sparkles, MessageCircle, Eye, Layers, Settings, LogOut, X } from 'lucide-react';

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

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => { if (sidebar.current) sidebar.current.inert = !media.matches && !mobileOpen; if (media.matches && mobileOpen) onClose(); };
    sync();
    media.addEventListener('change', sync);
    if (mobileOpen) {
      const previous = document.activeElement as HTMLElement | null;
      sidebar.current?.querySelector<HTMLButtonElement>('button')?.focus();
      const trap = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        const items = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select') || []).filter(item => item.offsetParent !== null);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      };
      window.addEventListener('keydown', trap);
      return () => { media.removeEventListener('change', sync); window.removeEventListener('keydown', trap); previous?.focus(); };
    }
    return () => media.removeEventListener('change', sync);
  }, [mobileOpen, onClose]);
  return <>
    {mobileOpen && <div className="nexo-menu-overlay lg:hidden" onClick={onClose} />}
    <aside ref={sidebar} id="app-navigation" className={`nexo-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Menu principal">
      <div className="nexo-sidebar-brand"><Link href="/dashboard" aria-label="NexoPost — painel"><BrandLogo size="sm" /></Link><button type="button" onClick={onClose} className="nexo-icon-button lg:hidden" aria-label="Fechar menu"><X size={18} /></button></div>
      <ProfileSwitcher />
      <nav aria-label="Navegação do aplicativo" className="nexo-nav">{navigation.map(item => <Link key={item.href} href={item.href} onClick={onClose} aria-current={pathname === item.href ? 'page' : undefined} className={`nexo-nav-link ${pathname === item.href ? 'is-active' : ''}`}><item.icon size={17} strokeWidth={1.7} /><span>{item.name}</span></Link>)}</nav>
      <div className="nexo-sidebar-user"><Link href="/settings" onClick={onClose} className="nexo-user-link"><span className="nexo-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span><span className="min-w-0"><span className="block text-xs font-semibold truncate">{user?.name || 'Usuário'}</span><span className="block text-[11px] text-slate-500 truncate">{user?.role === 'admin' ? 'Admin' : user?.email || 'Minha conta'}</span></span></Link><button type="button" onClick={() => logout()} className="nexo-nav-link w-full"><LogOut size={16} /><span>Sair da conta</span></button></div>
    </aside>
  </>;
}
