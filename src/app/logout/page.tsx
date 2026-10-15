'use client';

import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // silencioso
      }
      window.location.href = '/login';
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <p className="text-slate-500">Saindo...</p>
    </div>
  );
}
