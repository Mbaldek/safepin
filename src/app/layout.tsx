// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Brume',
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
    title: 'Brume',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} data-theme="light">
      <body className="min-h-dvh overscroll-none touch-manipulation">
        <a href="#main-content" className="skip-link">Skip to map</a>
        <a href="#bottom-nav" className="skip-link" style={{ left: '140px' }}>Skip to navigation</a>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}
