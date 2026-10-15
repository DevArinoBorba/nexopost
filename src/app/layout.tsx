import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Upload Posts - Upload Videos to Social Media',
  description: 'Upload your videos to the most popular social media with Upload Posts. Post to TikTok, Instagram, YouTube, Facebook, LinkedIn, X and more with a single API call.',
  keywords: 'Upload Posts, upload videos, social media, TikTok, Instagram, YouTube, Facebook, LinkedIn, X, Twitter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
