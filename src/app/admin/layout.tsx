// src/app/admin/layout.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tower Control — SafePin Admin',
  description: 'SafePin administrative dashboard',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f9fafb' }}>
        {children}
      </body>
    </html>
  );
}
