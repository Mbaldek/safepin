// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import GlobalToast from '@/components/GlobalToast';
import GlobalModals from '@/components/GlobalModals';

export const metadata: Metadata = {
  title: 'Breveil',
  description: 'A safer world, mapped by women — for women.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Breveil',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0F172A',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('breveil_theme');if(!t){t=localStorage.getItem('brume-theme');if(t){localStorage.setItem('breveil_theme',t);localStorage.removeItem('brume-theme')}}if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh overscroll-none touch-manipulation bg-(--surface-base) text-(--text-primary)">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:px-4 focus:py-2 focus:rounded" style={{ background: '#0F172A', color: '#FFFFFF' }}>Skip to content</a>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <GlobalModals />
        <GlobalToast />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1E293B',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#FFFFFF',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}
