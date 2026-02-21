// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafePin',
  description: 'A safer world, mapped by women — for women.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SafePin',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0c10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0c10] text-white min-h-dvh overscroll-none touch-manipulation">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#12151c',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#eef0f6',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  );
}
