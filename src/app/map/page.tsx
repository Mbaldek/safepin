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

export default function MapPage() {
  const router = useRouter();
  const { setPins, addPin, activeSheet, setActiveSheet } = useStore();
  const [userId, setUserId] = useState<string | null>(null);

  // Check auth — kick to login if not signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setUserId(session.user.id);
      }
    });
  }, [router]);

  // Load pins from database
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

  // Subscribe to new pins in real-time
  useEffect(() => {
    const channel = supabase
      .channel('pins-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pins' },
        (payload) => {
          addPin(payload.new as Pin);
          toast('📍 New pin reported nearby');
        }
      )
      .subscribe();

    // Cleanup when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [addPin]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#12151c] border-b border-[rgba(255,255,255,0.06)] z-50">
        <div className="text-lg font-bold tracking-tight">
          <span className="text-[#f43f5e]">Safe</span>Pin
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }}
          className="text-xs text-[#6b7490] hover:text-white transition"
        >
          Sign out
        </button>
      </div>

      {/* Map + overlays */}
      <div className="flex-1 relative">
        <MapView />
        <FilterBar />

        {/* FAB — report button */}
        <button
          onClick={() => setActiveSheet('report')}
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#e11d48] text-white text-2xl flex items-center justify-center shadow-lg shadow-[rgba(244,63,94,0.35)] z-50 hover:scale-105 active:scale-95 transition"
        >
          ＋
        </button>

        {/* Sheets */}
        {activeSheet === 'report' && <ReportSheet userId={userId} />}
        {activeSheet === 'detail' && <DetailSheet />}
      </div>
    </div>
  );
}