'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import TowerTopbar from '@/components/admin/TowerTopbar';
import TowerSidebar from '@/components/admin/TowerSidebar';
import AdminFooter from '@/components/admin/AdminFooter';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.is_admin) {
            setAllowed(true);
          } else {
            router.replace('/');
          }
        });
    });
  }, [router]);

  if (allowed === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-base)',
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading Tower Control...</div>
      </div>
    );
  }

  return <>{children}</>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { theme } = useAdminTheme();

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TowerTopbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <TowerSidebar />
        <main style={{ flex: 1, padding: 28, minHeight: 'calc(100vh - 56px)', overflow: 'auto' }}>
          {children}
        </main>
      </div>
      <AdminFooter />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
