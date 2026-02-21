// src/app/map/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { Pin } from '@/types';
import { toast } from 'sonner';
import MapView from '@/components/MapView';
import FilterBar from '@/components/FilterBar';
import ReportSheet from '@/components/ReportSheet';
import DetailSheet from '@/components/DetailSheet';
import ThemeToggle from '@/components/ThemeToggle';
import AddressSearch from '@/components/AddressSearch';

export default function MapPage() {
  const router = useRouter();
  const { setPins, addPin, activeSheet, setActiveSheet } = useStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setUserId(session.user.id);
        setLoading(false);
      }
    });
  }, [router]);

  useEffect(() => {
    async function loadPins() {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load pins');
        console.error(error);
        return;
      }
      setPins((data as Pin[]) || []);
    }
    loadPins();
  }, [setPins]);

  useEffect(() => {
    const channel = supabase
      .channel('pins-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pins' },
        (payload) => {
          addPin(payload.new as Pin);
          toast('New pin reported nearby');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addPin]);

  if (loading) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center text-2xl shadow-lg shadow-[rgba(244,63,94,0.3)] animate-pulse">
          🛡️
        </div>
        <div className="text-lg font-bold tracking-tight">
          <span style={{ color: 'var(--accent)' }}>Safe</span>
          <span style={{ color: 'var(--text-primary)' }}>Pin</span>
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mt-2" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="z-50" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
          <div className="text-lg font-bold tracking-tight">
            <span style={{ color: 'var(--accent)' }}>Safe</span>
            <span style={{ color: 'var(--text-primary)' }}>Pin</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              className="text-xs hover:opacity-80 transition"
              style={{ color: 'var(--text-muted)' }}
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="px-3 pb-2.5">
          <AddressSearch />
        </div>
      </div>

      {/* Map + overlays */}
      <div className="flex-1 relative">
        <MapView />
        <FilterBar />

        {/* FAB report button */}
        <button
          onClick={() => setActiveSheet('report')}
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#e11d48] text-white text-2xl flex items-center justify-center shadow-lg shadow-[rgba(244,63,94,0.35)] z-50 hover:scale-105 active:scale-95 transition"
        >
          +
        </button>

        {activeSheet === 'report' && <ReportSheet userId={userId} />}
        {activeSheet === 'detail' && <DetailSheet />}
      </div>
    </div>
  );
}