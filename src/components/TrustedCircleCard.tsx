// src/components/TrustedCircleCard.tsx — Primary Trusted Circle card for Community tab landing

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { TrustedContact } from '@/types';
import { toast } from 'sonner';
import { UserPlus, X, Check, Radio, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

type ContactRow = TrustedContact & { display_name: string | null };
type InviteRow  = TrustedContact & { sender_name: string | null };

const COLORS = ['#f43f5e','#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316'];
function nameColor(name: string | null) {
  if (!name) return '#6b7280';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function Avatar({ name, size = 36 }: { name: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, backgroundColor: nameColor(name), fontSize: size * 0.38 }}
    >
      {(name?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

const MAX_VISIBLE = 5;

export default function TrustedCircleCard({
  userId,
  onSeeOnMap,
}: {
  userId: string;
  onSeeOnMap?: () => void;
}) {
  const { addNotification, isSharingLocation } = useStore();
  const [contacts, setContacts]               = useState<ContactRow[]>([]);
  const [pendingReceived, setPendingReceived] = useState<InviteRow[]>([]);
  const [pendingSent, setPendingSent]         = useState<TrustedContact[]>([]);
  const [showAdd, setShowAdd]                 = useState(false);
  const [showAll, setShowAll]                 = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [searchResult, setSearchResult]       = useState<{ id: string; display_name: string | null } | null>(null);
  const [searching, setSearching]             = useState(false);
  const [inviting, setInviting]               = useState(false);
  const [loading, setLoading]                 = useState(true);

  const loadContacts = useCallback(async () => {
    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('*')
      .or(`user_id.eq.${userId},contact_id.eq.${userId}`);

    if (error || !data) { setLoading(false); return; }

    const ids = new Set(data.flatMap((r) => [r.user_id, r.contact_id]).filter((id) => id !== userId));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [...ids]);

    const nameMap: Record<string, string | null> = {};
    for (const p of (profiles ?? [])) nameMap[p.id] = p.display_name;

    const acc: ContactRow[] = [];
    const recv: InviteRow[]  = [];
    const sent: TrustedContact[] = [];

    for (const row of data) {
      if (row.status === 'accepted') {
        const cid = row.user_id === userId ? row.contact_id : row.user_id;
        acc.push({ ...row, display_name: nameMap[cid] ?? null });
      } else if (row.status === 'pending') {
        if (row.contact_id === userId) recv.push({ ...row, sender_name: nameMap[row.user_id] ?? null });
        else sent.push(row);
      }
    }

    setContacts(acc);
    setPendingReceived(recv);
    setPendingSent(sent);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadContacts();
    const ch = supabase
      .channel(`tc-card-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trusted_contacts',
        filter: `contact_id=eq.${userId}`,
      }, () => {
        loadContacts();
        addNotification({
          id: crypto.randomUUID(),
          type: 'trusted_contact',
          title: '👋 New Trusted Circle invite',
          body: 'Someone wants to add you to their circle',
          read: false,
          created_at: new Date().toISOString(),
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trusted_contacts' },
        () => loadContacts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadContacts, addNotification]);

  async function searchByName() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', searchQuery.trim())
      .neq('id', userId)
      .limit(1)
      .single();
    setSearchResult(data ?? null);
    setSearching(false);
  }

  async function sendInvite() {
    if (!searchResult) return;
    setInviting(true);
    const { error } = await supabase.from('trusted_contacts').insert({
      user_id: userId,
      contact_id: searchResult.id,
    });
    setInviting(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Already invited or in your circle' : 'Could not send invite');
      return;
    }
    toast.success(`Invite sent to ${searchResult.display_name ?? 'user'}`);
    setSearchQuery('');
    setSearchResult(null);
    setShowAdd(false);
    loadContacts();
  }

  async function respondInvite(id: string, accept: boolean) {
    const { error } = await supabase
      .from('trusted_contacts')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', id);
    if (error) { toast.error('Failed to respond'); return; }
    toast.success(accept ? 'Added to Trusted Circle ✓' : 'Invite declined');
    loadContacts();
  }

  async function removeContact(id: string) {
    await supabase.from('trusted_contacts').delete().eq('id', id);
    loadContacts();
  }

  if (loading) return null;

  const isEmpty = contacts.length === 0 && pendingSent.length === 0 && pendingReceived.length === 0;
  const visibleContacts = showAll ? contacts : contacts.slice(0, MAX_VISIBLE);
  const hasMore = contacts.length > MAX_VISIBLE;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
            Trusted Circle
          </p>
          {contacts.length > 0 && (
            <span
              className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              {contacts.length}
            </span>
          )}
          {isSharingLocation && (
            <span className="flex items-center gap-1 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              <Radio size={9} strokeWidth={2.5} />
              Live
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setSearchQuery(''); setSearchResult(null); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition hover:opacity-80"
          style={{
            backgroundColor: showAdd ? 'var(--accent)' : 'var(--bg-secondary)',
            color: showAdd ? '#fff' : 'var(--text-muted)',
          }}
        >
          <UserPlus size={11} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* Add contact panel */}
      {showAdd && (
        <div
          className="rounded-xl p-3 flex flex-col gap-2.5"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            Invite by display name
          </p>
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') searchByName(); }}
              placeholder="e.g. Marie, Alex…"
              className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
              style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={searchByName}
              disabled={!searchQuery.trim() || searching}
              className="px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {searching ? '…' : 'Find'}
            </button>
          </div>
          {searchResult && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Avatar name={searchResult.display_name} size={28} />
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {searchResult.display_name ?? 'Unknown'}
                </span>
              </div>
              <button
                onClick={sendInvite}
                disabled={inviting}
                className="px-3 py-1.5 rounded-xl text-xs font-black transition disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {inviting ? '…' : 'Invite'}
              </button>
            </div>
          )}
          {searchQuery.trim() && !searchResult && !searching && (
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              No user found · check the exact name
            </p>
          )}
        </div>
      )}

      {/* Pending invites received */}
      {pendingReceived.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: 'rgba(244,63,94,0.06)', border: '1.5px solid rgba(244,63,94,0.2)' }}
        >
          <div className="flex items-center gap-2.5">
            <Avatar name={inv.sender_name} size={30} />
            <div>
              <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                {inv.sender_name ?? 'Someone'}
              </p>
              <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>Wants to join your circle</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => respondInvite(inv.id, false)}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
            <button
              onClick={() => respondInvite(inv.id, true)}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#22c55e' }}
            >
              <Check size={12} color="#fff" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {isEmpty && !showAdd && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="text-3xl">👥</span>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Add your first safety contact
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Your Trusted Circle gets alerted during SOS and can watch your location during trips.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            <UserPlus size={11} strokeWidth={2.5} className="inline mr-1.5" style={{ verticalAlign: '-1px' }} />
            Add contact
          </button>
        </div>
      )}

      {/* Contact list */}
      {contacts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {visibleContacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar name={c.display_name} size={32} />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ backgroundColor: '#22c55e', borderColor: 'var(--bg-secondary)' }}
                  />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {c.display_name ?? 'Unknown'}
                </p>
              </div>
              <button
                onClick={() => removeContact(c.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition hover:opacity-70"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
          {/* Pending sent */}
          {pendingSent.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl opacity-50"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: 'var(--bg-card)' }}>
                  ⏳
                </div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Invite pending…</p>
              </div>
              <button
                onClick={() => removeContact(s.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                <X size={10} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
          {/* See all / collapse */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center justify-center gap-1 py-1.5 text-xs font-bold transition"
              style={{ color: 'var(--text-muted)' }}
            >
              {showAll ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> See all ({contacts.length})</>}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      {contacts.length > 0 && (
        <div className="flex gap-2">
          {onSeeOnMap && (
            <button
              onClick={onSeeOnMap}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.98]"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <MapPin size={12} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
              See on map
            </button>
          )}
        </div>
      )}

      {/* SOS context */}
      <p className="text-[0.6rem] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        These contacts are alerted when you trigger SOS.
      </p>
    </div>
  );
}
