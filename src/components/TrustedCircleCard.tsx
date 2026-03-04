// src/components/TrustedCircleCard.tsx — Primary Trusted Circle card for Community tab landing
// NOT WIRED YET — cleaned up, ready to connect in SecuriteScreen (next sprint).

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { useTheme } from '@/stores/useTheme';
import { TrustedContact } from '@/types';
import { toast } from 'sonner';
import { UserPlus, X, Check, Radio, MapPin, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { useContactPresence } from '@/lib/usePresence';
import { useTranslations } from 'next-intl';

function getColors(isDark: boolean) {
  return isDark ? {
    bg: '#0F172A', card: '#1E293B', elevated: '#334155',
    t1: '#FFFFFF', t2: '#94A3B8', t3: '#64748B',
    border: 'rgba(255,255,255,0.08)',
  } : {
    bg: '#F8FAFC', card: '#FFFFFF', elevated: '#F1F5F9',
    t1: '#0F172A', t2: '#475569', t3: '#94A3B8',
    border: 'rgba(15,23,42,0.07)',
  };
}

const F = {
  cyan: '#3BB4C1',
  success: '#34D399', successSoft: 'rgba(52,211,153,0.12)', successBorder: 'rgba(52,211,153,0.25)',
  gold: '#F5C341', goldSoft: 'rgba(245,195,65,0.06)', goldBorder: 'rgba(245,195,65,0.2)',
  blue: '#3b82f6',
};

type ContactRow = TrustedContact & { display_name: string | null; contact_user_id: string };
type InviteRow  = TrustedContact & { sender_name: string | null };

const COLORS = [F.gold, '#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];
function nameColor(name: string | null) {
  if (!name) return '#6b7280';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function AvatarCircle({ name, size = 36 }: { name: string | null; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-black shrink-0"
      style={{ width: size, height: size, backgroundColor: nameColor(name), color: '#fff', fontSize: size * 0.38 }}
    >
      {(name?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

const PRESENCE_COLORS = { online: '#22c55e', recent: '#f59e0b', offline: '#9ca3af' };
const CHECKIN_COOLDOWN = 60 * 60 * 1000;
const MAX_VISIBLE = 5;

export default function TrustedCircleCard({
  userId,
  onSeeOnMap,
  compact = false,
}: {
  userId: string;
  onSeeOnMap?: () => void;
  compact?: boolean;
}) {
  const { addNotification, isSharingLocation, watchedLocations } = useStore();
  const isDark = useTheme((s) => s.theme) === 'dark';
  const C = getColors(isDark);
  const t = useTranslations('community');
  const [contacts, setContacts]               = useState<ContactRow[]>([]);
  const [pendingReceived, setPendingReceived] = useState<InviteRow[]>([]);
  const [pendingSent, setPendingSent]         = useState<TrustedContact[]>([]);
  const [showAdd, setShowAdd]                 = useState(false);
  const [showAll, setShowAll]                 = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [searchResults, setSearchResults]     = useState<{ id: string; display_name: string | null }[]>([]);
  const [searching, setSearching]             = useState(false);
  const [inviting, setInviting]               = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [checkingIn, setCheckingIn]           = useState(false);

  const contactIds = useMemo(() => contacts.map((c) => c.contact_user_id), [contacts]);
  const presenceMap = useContactPresence(contactIds);

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
        acc.push({ ...row, display_name: nameMap[cid] ?? null, contact_user_id: cid });
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
    setSearchResults([]);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', `%${searchQuery.trim()}%`)
      .neq('id', userId)
      .limit(5);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  async function sendInviteTo(target: { id: string; display_name: string | null }) {
    setInviting(true);
    const { error } = await supabase.from('trusted_contacts').insert({
      user_id: userId,
      contact_id: target.id,
    });
    setInviting(false);
    if (error) {
      toast.error(error.code === '23505' ? t('alreadyInvited') : t('couldNotSend'));
      return;
    }
    toast.success(t('inviteSentTo', { name: target.display_name ?? 'user' }));
    setSearchQuery('');
    setSearchResults([]);
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

  async function checkInWithCircle() {
    const lastCheckin = localStorage.getItem('brume_last_checkin');
    if (lastCheckin && Date.now() - Number(lastCheckin) < CHECKIN_COOLDOWN) {
      const minsLeft = Math.ceil((CHECKIN_COOLDOWN - (Date.now() - Number(lastCheckin))) / 60_000);
      toast.error(t('checkInCooldown', { n: minsLeft }));
      return;
    }

    setCheckingIn(true);
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    const senderName = profile?.display_name ?? 'Someone';

    let sent = 0;
    for (const contact of contacts) {
      const cid = contact.contact_user_id;
      const [u1, u2] = [userId, cid].sort();
      let { data: convo } = await supabase
        .from('dm_conversations')
        .select('id')
        .eq('user1_id', u1)
        .eq('user2_id', u2)
        .single();

      if (!convo) {
        const { data: newConvo } = await supabase
          .from('dm_conversations')
          .insert({ user1_id: u1, user2_id: u2 })
          .select('id')
          .single();
        convo = newConvo;
      }
      if (!convo) continue;

      await supabase.from('direct_messages').insert({
        conversation_id: convo.id,
        sender_id: userId,
        content: `🛡️ ${senderName} a fait un check-in — tout va bien`,
        content_type: 'text',
      });
      await supabase.from('dm_conversations').update({
        last_message: `🛡️ ${senderName} a fait un check-in`,
        last_message_sender_id: userId,
        last_message_at: new Date().toISOString(),
      }).eq('id', convo.id);
      sent++;
    }

    localStorage.setItem('brume_last_checkin', String(Date.now()));
    setCheckingIn(false);
    toast.success(t('checkInSent', { n: sent }));
  }

  if (loading) return null;

  const isEmpty = contacts.length === 0 && pendingSent.length === 0 && pendingReceived.length === 0;
  const visibleContacts = showAll ? contacts : contacts.slice(0, MAX_VISIBLE);
  const hasMore = contacts.length > MAX_VISIBLE;
  const onlineCount = contactIds.filter((id) => presenceMap[id]?.status === 'online').length;

  // ─── Compact mode for My Breveil ────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className="rounded-2xl p-3.5 flex flex-col gap-2.5"
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">💛</span>
            <p className="text-xs font-black" style={{ color: C.t1 }}>{t('circle')}</p>
            {contacts.length > 0 && (
              <span className="text-[0.55rem] font-black px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: C.elevated, color: C.t2 }}>
                {contacts.length}
              </span>
            )}
          </div>
          {onlineCount > 0 && (
            <span className="flex items-center gap-1 text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: F.successSoft, color: F.success }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: F.success }} />
              {t('circleOnline', { n: onlineCount })}
            </span>
          )}
        </div>
        {contacts.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {contacts.slice(0, 6).map((c) => (
                <div key={c.id} className="relative">
                  <AvatarCircle name={c.display_name} size={28} />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                    style={{
                      backgroundColor: PRESENCE_COLORS[presenceMap[c.contact_user_id]?.status ?? 'offline'],
                      borderColor: C.card,
                    }}
                  />
                </div>
              ))}
              {contacts.length > 6 && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.5rem] font-black"
                  style={{ backgroundColor: C.elevated, color: C.t2 }}>
                  +{contacts.length - 6}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[0.6rem]" style={{ color: C.t2 }}>{t('noContactsYet')}</p>
        )}
        {pendingReceived.length > 0 && (
          <p className="text-[0.55rem] font-bold" style={{ color: F.cyan }}>
            {pendingReceived.length} invitation{pendingReceived.length > 1 ? 's' : ''} en attente
          </p>
        )}
      </div>
    );
  }

  // ─── Full mode ────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">💛</span>
          <p className="text-sm font-black" style={{ color: C.t1 }}>
            {t('circle')}
          </p>
          {contacts.length > 0 && (
            <span
              className="text-[0.6rem] font-black px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: C.elevated, color: C.t2 }}
            >
              {contacts.length}
            </span>
          )}
          {isSharingLocation && (
            <span className="flex items-center gap-1 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: F.successSoft, color: F.success }}>
              <Radio size={9} strokeWidth={2.5} />
              {t('sharingLive')}
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setSearchQuery(''); setSearchResults([]); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition hover:opacity-80"
          style={{
            backgroundColor: showAdd ? F.cyan : C.elevated,
            color: showAdd ? '#fff' : C.t2,
          }}
        >
          <UserPlus size={11} strokeWidth={2.5} />
          {t('add')}
        </button>
      </div>

      {/* Add contact panel */}
      {showAdd && (
        <div
          className="rounded-xl p-3 flex flex-col gap-2.5"
          style={{ backgroundColor: C.elevated, border: `1px solid ${C.border}` }}
        >
          <p className="text-xs font-bold" style={{ color: C.t1 }}>
            {t('searchByName')}
          </p>
          <div className="flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]); }}
              onKeyDown={(e) => { if (e.key === 'Enter') searchByName(); }}
              placeholder="ex. Marie, Alex…"
              className="flex-1 text-sm rounded-xl px-3 py-2 outline-none"
              style={{ backgroundColor: C.card, border: `1.5px solid ${C.border}`, color: C.t1 }}
            />
            <button
              onClick={searchByName}
              disabled={!searchQuery.trim() || searching}
              className="px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
              style={{ backgroundColor: F.cyan, color: '#fff' }}
            >
              {searching ? '…' : t('find')}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {searchResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <AvatarCircle name={r.display_name} size={28} />
                    <span className="text-sm font-bold" style={{ color: C.t1 }}>
                      {r.display_name ?? 'Inconnu'}
                    </span>
                  </div>
                  <button
                    onClick={() => sendInviteTo(r)}
                    disabled={inviting}
                    className="px-3 py-1.5 rounded-xl text-xs font-black transition disabled:opacity-50"
                    style={{ backgroundColor: F.cyan, color: '#fff' }}
                  >
                    {inviting ? '…' : 'Inviter'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && !searching && (
            <p className="text-xs text-center" style={{ color: C.t2 }}>
              {t('noUserFound')}
            </p>
          )}
        </div>
      )}

      {/* Pending invites received */}
      {pendingReceived.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: F.goldSoft, border: `1.5px solid ${F.goldBorder}` }}
        >
          <div className="flex items-center gap-2.5">
            <AvatarCircle name={inv.sender_name} size={30} />
            <div>
              <p className="text-xs font-black" style={{ color: C.t1 }}>
                {inv.sender_name ?? 'Quelqu\u2019un'}
              </p>
              <p className="text-[0.6rem]" style={{ color: C.t2 }}>{t('wantsToJoin')}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => respondInvite(inv.id, false)}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <X size={12} style={{ color: C.t2 }} />
            </button>
            <button
              onClick={() => respondInvite(inv.id, true)}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: F.success }}
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
          <p className="text-sm font-bold" style={{ color: C.t1 }}>
            {t('addFirstContacts')}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: C.t2 }}>
            {t('circleDescription')}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition"
            style={{ backgroundColor: F.cyan, color: '#fff' }}
          >
            <UserPlus size={11} strokeWidth={2.5} className="inline mr-1.5" style={{ verticalAlign: '-1px' }} />
            {t('inviteContact')}
          </button>
        </div>
      )}

      {/* Contact list */}
      {contacts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {visibleContacts.map((c) => {
            const presence = presenceMap[c.contact_user_id];
            const isSharing = !!watchedLocations[c.contact_user_id];
            return (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ backgroundColor: C.elevated }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <AvatarCircle name={c.display_name} size={32} />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        backgroundColor: PRESENCE_COLORS[presence?.status ?? 'offline'],
                        borderColor: C.elevated,
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate" style={{ color: C.t1 }}>
                        {c.display_name ?? 'Inconnu'}
                      </p>
                      {isSharing && (
                        <MapPin size={10} strokeWidth={2.5} style={{ color: F.blue }} className="shrink-0" />
                      )}
                    </div>
                    {presence && presence.status !== 'online' && presence.label && (
                      <p className="text-[0.55rem]" style={{ color: C.t2 }}>{presence.label}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeContact(c.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition hover:opacity-70 shrink-0"
                  style={{ backgroundColor: C.card }}
                >
                  <X size={11} style={{ color: C.t2 }} />
                </button>
              </div>
            );
          })}
          {/* Pending sent */}
          {pendingSent.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl opacity-50"
              style={{ backgroundColor: C.elevated, border: `1px dashed ${C.border}` }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: C.card }}>
                  ⏳
                </div>
                <p className="text-xs font-bold" style={{ color: C.t2 }}>{t('invitePending')}</p>
              </div>
              <button
                onClick={() => removeContact(s.id)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: C.card }}
              >
                <X size={10} style={{ color: C.t2 }} />
              </button>
            </div>
          ))}
          {/* See all / collapse */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center justify-center gap-1 py-1.5 text-xs font-bold transition"
              style={{ color: C.t2 }}
            >
              {showAll ? <><ChevronUp size={12} /> {t('showLess')}</> : <><ChevronDown size={12} /> {t('seeAll', { n: contacts.length })}</>}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      {contacts.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={checkInWithCircle}
            disabled={checkingIn}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: F.successSoft, border: `1px solid ${F.successBorder}`, color: F.success }}
          >
            <Heart size={12} strokeWidth={2.5} />
            {checkingIn ? t('checkInSending') : t('checkIn')}
          </button>
          {onSeeOnMap && (
            <button
              onClick={onSeeOnMap}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.98]"
              style={{ backgroundColor: C.elevated, border: `1px solid ${C.border}`, color: C.t1 }}
            >
              <MapPin size={12} strokeWidth={2.5} style={{ color: F.cyan }} />
              {t('seeOnMap')}
            </button>
          )}
        </div>
      )}

      <p className="text-[0.6rem] text-center leading-relaxed" style={{ color: C.t2 }}>
        {t('circleDescription')}
      </p>
    </div>
  );
}
