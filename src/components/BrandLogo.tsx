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
    const dims = size === 'lg' ? 'h-28' : size === 'sm' ? 'h-16' : 'h-22';
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
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const textSize =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
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

      {layout === 'horizontal' && (
        <div className="flex items-baseline gap-2">
          <span
            className={`${textSize} font-bold tracking-tight lowercase ${
              tone === 'light'
                ? 'text-white'
                : tone === 'dark'
                  ? 'text-slate-950'
                  : 'text-slate-950 dark:text-white'
            }`}
          >
            nexopost
          </span>
          {subtitle && (
            <span className="hidden sm:inline-block text-xs font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
