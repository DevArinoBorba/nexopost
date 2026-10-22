'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (workspace.current) workspace.current.inert = menuOpen; }, [menuOpen]);
  const pathname = usePathname();
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); };
  }, [menuOpen]);
  return <div className="nexo-app">
    <a href="#main-content" className="nexo-skip-link">Ir para o conteúdo</a>
    <Sidebar mobileOpen={menuOpen} onClose={closeMenu} />
    <div className="nexo-workspace" ref={workspace}>
      <Header title={title} subtitle={subtitle} menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(true)} />
      <main id="main-content" tabIndex={-1} className={`nexo-main ${className}`}>{children}</main>
    </div>
  </div>;
}
