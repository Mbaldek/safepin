import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { timeAgo } from '@/lib/utils';

const GRADIENTS = [
  ['#A78BFA', '#8B5CF6'],
  ['#3BB4C1', '#06B6D4'],
  ['#F5C341', '#F59E0B'],
  ['#34D399', '#10B981'],
  ['#EF4444', '#DC2626'],
];

function pickGradient(id: string): string[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

let prefetching = false;

/**
 * Background-prefetch the community feed into Zustand cache.
 * Safe to call multiple times — deduplicates and skips if cache is fresh.
 */
export async function prefetchFeed(userId: string) {
  const { feedCache, setFeedCache } = useStore.getState();

  // Skip if cache is fresh (< 2 min) or already prefetching
  if (prefetching) return;
  if (feedCache && Date.now() - feedCache.fetchedAt < 2 * 60 * 1000) return;

  prefetching = true;

  try {
    const userLocation = useStore.getState().userLocation;
    const lat = userLocation?.lat ?? 48.8566;
    const lng = userLocation?.lng ?? 2.3522;

    // Single RPC: social graph + posts + pins — 1 round-trip
    const [feedResult, sosResult] = await Promise.all([
      supabase.rpc('user_feed', { p_user_id: userId, p_lat: lat, p_lng: lng, p_limit: 50 }),
      supabase.from('community_posts').select('*').eq('type', 'sos_alert').order('created_at', { ascending: false }).limit(20).then(r => r, () => ({ data: null })),
    ]);

    const feed = feedResult.data as any;
    if (!feed || feedResult.error) return;

    const ids: string[] = feed.community_ids ?? [];
    if (!ids.length) {
      setFeedCache({ posts: [], sosPosts: [], pinPosts: [], communityIds: [], fetchedAt: Date.now() });
      return;
    }

    // Process posts (visibility already filtered server-side)
    const processedPosts = (feed.posts ?? []).map((m: any) => {
      const displayName = m.author_display_name || m.author_first_name || m.display_name || 'Anonyme';
      const name = m.author_username || displayName;
      const avatar = m.author_avatar_emoji || name.charAt(0).toUpperCase();
      return {
        id: m.id, type: 'quartier' as const,
        user: { name, avatar, avatarUrl: m.author_avatar_url || null, gradientColors: pickGradient(m.user_id) },
        time: timeAgo(m.created_at), title: '', content: m.content,
        comments: Number(m.comment_count) || 0, userId: m.user_id,
        username: m.author_username || null, displayName, _createdAt: m.created_at,
      };
    });

    // Process SOS
    let processedSos: any[] = [];
    try {
      const sosRows = (sosResult as any)?.data;
      if (sosRows?.length) {
        const visibleSos = sosRows.filter((s: any) => {
          if (s.visibility === 'community') return true;
          if (s.visibility === 'circle') return s.author_id === userId || (s.metadata?.circleMembers ?? []).includes(userId);
          return false;
        });
        const sosAuthorIds = [...new Set(visibleSos.map((s: any) => s.author_id))];
        const { data: sosProfiles } = await supabase.from('profiles').select('id, display_name, avatar_emoji').in('id', sosAuthorIds);
        const sosProfileMap = new Map((sosProfiles || []).map((p: any) => [p.id, p]));
        processedSos = visibleSos.map((s: any) => {
          const prof = sosProfileMap.get(s.author_id);
          return { ...s, author_name: s.is_anonymous ? null : (prof?.display_name ?? null), author_emoji: s.is_anonymous ? null : (prof?.avatar_emoji ?? null), _isSos: true, _createdAt: s.created_at };
        });
      }
    } catch { /* silent */ }

    // Process pins (profiles already joined server-side, deduplicate nearby + social)
    const allPins = [...(feed.nearby_pins ?? []), ...(feed.social_pins ?? [])];
    const seenPinIds = new Set<string>();
    const uniquePins = allPins.filter((p: any) => { if (seenPinIds.has(p.id)) return false; seenPinIds.add(p.id); return true; });
    const processedPins = uniquePins.map((pin: any) => {
      const displayName = pin.display_name || pin.first_name || 'Anonyme';
      const name = pin.username || displayName;
      const avatar = pin.avatar_emoji || name.charAt(0).toUpperCase();
      return {
        id: pin.id, type: 'pin' as const, _isPin: true, _isSos: false, _createdAt: pin.created_at,
        category: pin.category, severity: pin.severity, description: pin.description, address: pin.address,
        photo_url: pin.photo_url, confirmations: pin.confirmations || 0, lat: pin.lat, lng: pin.lng,
        userId: pin.user_id, user: { name, avatar, avatarUrl: pin.avatar_url || null, gradientColors: pickGradient(pin.user_id) },
        content: pin.description || '',
      };
    });

    setFeedCache({ posts: processedPosts, sosPosts: processedSos, pinPosts: processedPins, communityIds: ids, fetchedAt: Date.now() });
  } finally {
    prefetching = false;
  }
}
