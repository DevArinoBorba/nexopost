'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';
const ThemeContext = createContext({ theme: 'system' as Theme, isDark: false, setTheme: (_theme: Theme) => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, updateTheme] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem('theme'); } catch {}
      const mode = saved === 'light' || saved === 'dark' ? saved : 'system';
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      updateTheme(mode);
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('nexo-theme', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('nexo-theme', sync);
    };
  }, []);
  const setTheme = (mode: Theme) => {
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    try { localStorage.setItem('theme', mode); } catch {}
    updateTheme(mode);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    window.dispatchEvent(new Event('nexo-theme'));
  };
  return <ThemeContext.Provider value={{ theme, isDark, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle() {
  const { isDark, setTheme } = useTheme();
  return <button type="button" className="nexo-icon-button" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'} title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}>
    {isDark ? <Sun size={19} /> : <Moon size={19} />}
  </button>;
}
