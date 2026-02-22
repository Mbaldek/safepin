// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'KOVA',
  description: 'A safer world, mapped by women — for women.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KOVA',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f5f6fa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body className="min-h-dvh overscroll-none touch-manipulation">
        <ThemeProvider>
          {children}
        </ThemeProvider>
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