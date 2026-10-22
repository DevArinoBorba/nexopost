'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Plus, Menu, X } from 'lucide-react';
import { backend } from '@/lib/client';
import { ThemeToggle } from './ThemeProvider';

interface HeaderProps { title?: string; subtitle?: string; menuOpen?: boolean; onMenuToggle?: () => void; }
interface Notification { id: string; message: string; }

export default function Header({ title, subtitle, menuOpen, onMenuToggle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationButton = useRef<HTMLButtonElement>(null);
  const notificationPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    backend.getPosts(10).then((data) => {
      const list: Notification[] = [];
      for (const post of data.posts || []) for (const target of post.targets || []) {
        if (target.status === 'failed' || target.status === 'published') list.push({
          id: `${post.id}-${target.platform}`,
          message: `${target.status === 'failed' ? 'Falha ao publicar' : 'Publicado'} "${post.title || 'post'}" no ${target.platform}`,
        });
      }
      setNotifications(list.slice(0, 8));
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!showNotifications) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowNotifications(false); notificationButton.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!notificationPanel.current?.contains(event.target as Node) && !notificationButton.current?.contains(event.target as Node)) setShowNotifications(false);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('pointerdown', outside); };
  }, [showNotifications]);
  return <header className="nexo-header">
    <div className="nexo-header-heading">
      <button type="button" className="nexo-icon-button lg:hidden" onClick={onMenuToggle} aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="app-navigation"><Menu size={20} /></button>
      <div><h1>{title || 'NEXOPOST'}</h1>{subtitle && <p>{subtitle}</p>}</div>
    </div>
    <div className="nexo-header-actions">
      <Link href="/upload" className="nexo-primary"><Plus size={15} /><span>Publicar</span></Link>
      <ThemeToggle />
      <div className="relative">
        <button type="button" ref={notificationButton} onClick={() => setShowNotifications(!showNotifications)} className="nexo-icon-button relative" aria-label={`Notificações${notifications.length ? ` (${notifications.length})` : ''}`} aria-expanded={showNotifications} aria-controls="notifications-panel"><Bell size={18} />{notifications.length > 0 && <span className="nexo-notification-dot" />}</button>
        {showNotifications && <div ref={notificationPanel} id="notifications-panel" className="nexo-notifications" role="region" aria-label="Notificações">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800"><h2 className="text-sm font-semibold">Notificações</h2><button className="nexo-icon-button" aria-label="Fechar notificações" onClick={() => setShowNotifications(false)}><X size={16} /></button></div>
          <div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <p className="p-5 text-sm text-slate-500">Sem notificações.</p> : notifications.map((item) => <p key={item.id} className="p-4 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">{item.message}</p>)}</div>
        </div>}
      </div>
    </div>
  </header>;
}
