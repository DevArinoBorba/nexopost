import React from 'react';

interface BrandLogoProps {
  /** 'horizontal' (ícone + texto ao lado), 'stacked' (logo completa vertical) ou 'mark' (apenas símbolo) */
  layout?: 'horizontal' | 'stacked' | 'mark';
  /** 'auto' alterna conforme tema claro/escuro; 'light' força versão branca (negativa); 'dark' força versão escura (positiva) */
  tone?: 'auto' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
}

export default function BrandLogo({
  layout = 'horizontal',
  tone = 'auto',
  size = 'md',
  subtitle,
  className = '',
}: BrandLogoProps) {
  if (layout === 'stacked') {
    const dims = size === 'lg' ? 'h-32 sm:h-36' : size === 'sm' ? 'h-20' : 'h-28';
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        {tone === 'light' && (
          <img
            src="/logo-full-light.png"
            alt="NexoPost"
            className={`${dims} w-auto object-contain select-none`}
          />
        )}
        {tone === 'dark' && (
          <img
            src="/logo-full-dark.png"
            alt="NexoPost"
            className={`${dims} w-auto object-contain select-none`}
          />
        )}
        {tone === 'auto' && (
          <>
            <img
              src="/logo-full-dark.png"
              alt="NexoPost"
              className={`${dims} w-auto object-contain select-none dark:hidden`}
            />
            <img
              src="/logo-full-light.png"
              alt="NexoPost"
              className={`${dims} w-auto object-contain select-none hidden dark:block`}
            />
          </>
        )}
      </div>
    );
  }

  const markSize =
    size === 'sm'
      ? 'h-11 sm:h-12 w-auto'
      : size === 'lg'
        ? 'h-14 sm:h-16 w-auto'
        : 'h-12 sm:h-14 w-auto';

  return (
    <div className={`inline-flex items-center ${className}`}>
      {tone === 'light' && (
        <img
          src="/logo-mark-light.png"
          alt="NexoPost"
          className={`${markSize} object-contain select-none shrink-0`}
        />
      )}
      {tone === 'dark' && (
        <img
          src="/logo-mark-dark.png"
          alt="NexoPost"
          className={`${markSize} object-contain select-none shrink-0`}
        />
      )}
      {tone === 'auto' && (
        <>
          <img
            src="/logo-mark-dark.png"
            alt="NexoPost"
            className={`${markSize} object-contain select-none shrink-0 dark:hidden`}
          />
          <img
            src="/logo-mark-light.png"
            alt="NexoPost"
            className={`${markSize} object-contain select-none shrink-0 hidden dark:block`}
          />
        </>
      )}
      {layout === 'horizontal' && <span className={`ml-2 font-sans font-bold tracking-tight ${size === 'sm' ? 'text-sm' : 'text-lg'} ${tone === 'light' ? 'text-white' : tone === 'dark' ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>NEXOPOST</span>}
    </div>
  );
}
