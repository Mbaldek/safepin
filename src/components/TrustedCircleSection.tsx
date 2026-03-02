// src/components/TrustedCircleSection.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { TrustedContact } from '@/types';
import { toast } from 'sonner';
import { UserPlus, X, Check, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactRow = TrustedContact & { display_name: string | null };
type InviteRow  = TrustedContact & { sender_name: string | null };

// ─── Avatar ───────────────────────────────────────────────────────────────────

const COLORS = ['#D4A853','#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316'];
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrustedCircleSection({ userId }: { userId: string }) {
  const { addNotification, isSharingLocation } = useStore();
  const t = useTranslations('community');
  const [contacts, setContacts]               = useState<ContactRow[]>([]);
  const [pendingReceived, setPendingReceived] = useState<InviteRow[]>([]);
  const [pendingSent, setPendingSent]         = useState<TrustedContact[]>([]);
  const [showAdd, setShowAdd]                 = useState(false);
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

    // Realtime: listen for new invites addressed to me
    const ch = supabase
      .channel(`tc-inbox-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trusted_contacts',
        filter: `contact_id=eq.${userId}`,
      }, () => {
        loadContacts();
        addNotification({
          id: crypto.randomUUID(),
          type: 'trusted_contact',
          title: t('notifNewInvite'),
          body: t('notifInviteBody'),
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
      toast.error(error.code === '23505' ? t('alreadyInvited') : t('couldNotSend'));
      return;
    }
    toast.success(t('inviteSentTo', { name: searchResult.display_name ?? 'user' }));
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
    if (error) { toast.error(t('failedToRespond')); return; }
    toast.success(accept ? t('addedToCircle') : t('inviteDeclined'));
    loadContacts();
  }

  async function removeContact(id: string) {
    await supabase.from('trusted_contacts').delete().eq('id', id);
    loadContacts();
  }

  if (loading) return null;

  const isEmpty = contacts.length === 0 && pendingSent.length === 0 && pendingReceived.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <p className="text-[0.7rem] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {t('circle')}
          </p>
          {contacts.length > 0 && (
            <span
              className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
            >
              {contacts.length}
            </span>
          )}
          {isSharingLocation && (
            <span className="flex items-center gap-1 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              <Radio size={9} strokeWidth={2.5} />
              {t('sharingLive')}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setSearchQuery(''); setSearchResult(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition hover:opacity-80"
          style={{
            backgroundColor: showAdd ? 'var(--accent)' : 'var(--bg-card)',
            color: showAdd ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${showAdd ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          <UserPlus size={12} strokeWidth={2.5} />
          {t('add')}
        </button>
      </div>

      {/* Add contact panel */}
      {showAdd && (
        <div
          className="rounded-2xl p-4 mb-3 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('searchByName')}
          </p>
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') searchByName(); }}
              placeholder="e.g. Marie, Alex…"
              className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={searchByName}
              disabled={!searchQuery.trim() || searching}
              className="px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              {searching ? '…' : t('find')}
            </button>
          </div>
          {searchResult && (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Avatar name={searchResult.display_name} size={32} />
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
              {t('noUserFound')}
            </p>
          )}
        </div>
      )}

      {/* Pending invites I received */}
      {pendingReceived.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {pendingReceived.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'rgba(212,168,83,0.06)', border: '1.5px solid rgba(212,168,83,0.2)' }}
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={inv.sender_name} size={32} />
                <div>
                  <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                    {inv.sender_name ?? 'Someone'}
                  </p>
                  <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>{t('wantsToAdd')}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => respondInvite(inv.id, false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <X size={13} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button
                  onClick={() => respondInvite(inv.id, true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <Check size={13} color="#fff" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div
          className="rounded-2xl p-5 flex flex-col items-center gap-2 text-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl">👥</span>
          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{t('noCircleYet')}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('addPeopleTrust')}
          </p>
        </div>
      )}

      {/* Accepted contacts + pending sent */}
      {!isEmpty && (
        <div className="flex flex-col gap-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar name={c.display_name} size={36} />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ backgroundColor: '#22c55e', borderColor: 'var(--bg-card)' }}
                  />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    {c.display_name ?? 'Unknown'}
                  </p>
                  <p className="text-[0.6rem] font-bold" style={{ color: '#22c55e' }}>{t('trustedBadge')}</p>
                </div>
              </div>
              <button
                onClick={() => removeContact(c.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <X size={13} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
          {pendingSent.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-4 py-3 rounded-2xl opacity-60"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  ⏳
                </div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{t('invitePending')}</p>
              </div>
              <button
                onClick={() => removeContact(s.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
