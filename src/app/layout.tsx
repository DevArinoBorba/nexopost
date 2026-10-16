import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'NexoPost — Publique e Agende Conteúdo em Todas as Redes',
  description: 'Publique vídeos, fotos e textos no TikTok, Instagram, YouTube, Facebook e mais em um só lugar com o NexoPost.',
  keywords: 'NexoPost, publicar vídeos, agendar posts, redes sociais, TikTok, Instagram, YouTube, Facebook, automação',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
