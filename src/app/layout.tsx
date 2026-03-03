// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import SimulationTicker from '@/components/SimulationTicker';

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
    <html lang={locale} data-theme="dark">
      <body className="min-h-dvh overscroll-none touch-manipulation bg-(--surface-base) text-(--text-primary)">
        <a href="#main-content" className="skip-link">Skip to map</a>
        <a href="#bottom-nav" className="skip-link" style={{ left: '140px' }}>Skip to navigation</a>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
            <SimulationTicker />
          </ThemeProvider>
        </NextIntlClientProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}
