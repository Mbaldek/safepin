// src/types/index.ts

export type MediaItem = {
  url: string;
  type: 'image' | 'video' | 'audio';
};

export type Pin = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  category: string;
  severity: 'low' | 'med' | 'high';
  description?: string;
  photo_url?: string | null;
  media_urls?: string[] | null;
  address?: string;
  environment?: string | null;
  urban_context?: string | null;
  urban_context_custom?: string | null;
  is_moving?: boolean | null;
  is_emergency?: boolean;
  resolved_at?: string | null;
  last_confirmed_at?: string | null;
  flag_count: number;
  hidden_at?: string | null;
  is_simulated?: boolean;
  // Transport fields
  is_transport?: boolean;
  transport_type?: 'metro' | 'rer' | 'bus' | 'tram';
  transport_line?: string;
  // Confirmations
  confirmations?: number;
  decay_type?: 'people' | 'infra' | 'positive';
  created_at: string;
};

export type PinEvidence = {
  id: string;
  pin_id: string;
  user_id: string;
  activity: 'report' | 'confirmation' | 'rejection';
  content: string | null;
  media_urls: MediaItem[] | null;
  created_at: string;
};

export type Comment = {
  id: string;
  pin_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
};

export type AppNotification = {
  id: string;
  type: 'emergency' | 'vote' | 'comment' | 'resolve' | 'community' | 'trusted_contact' | 'milestone' | 'digest' | 'trip_share';
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  pin_id?: string;
  community_id?: string;
};

export type TrustedContact = {
  id: string;
  user_id: string;
  contact_id: string;
  nickname: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

export type SavedRoute = {
  id: string;
  user_id: string;
  name: string;
  from_label: string | null;
  to_label: string;
  mode: string;
  coords: [number, number][];
  danger_score_last: number;
  trip_count: number;
  last_used_at: string;
  is_public?: boolean;
  upvote_count?: number;
  share_token?: string | null;
  created_at: string;
};

export type Community = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  owner_id: string;
  avatar_emoji: string;
  community_type: 'community' | 'group';
  parent_community_id: string | null;
  created_at: string;
  member_count: number; // computed client-side
};

export type CommunityMessage = {
  id: string;
  community_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
};

export type DMConversation = {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_sender_id: string | null;
  last_message_at: string;
  user1_last_read_at: string | null;
  user2_last_read_at: string | null;
  created_at: string;
  // enriched client-side
  partner_id: string;
  partner_name: string | null;
  is_unread: boolean;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  content_type: 'text' | 'image' | 'video' | 'audio';
  media_url: string | null;
  created_at: string;
};

export type CommunityStory = {
  id: string;
  community_id: string;
  user_id: string;
  display_name: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
};

export type PinStory = {
  id: string;
  pin_id: string;
  user_id: string;
  display_name: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
};

export type PinFollow = {
  id: string;
  user_id: string;
  pin_id: string;
  created_at: string;
};

export type LiveSession = {
  id: string;
  pin_id: string;
  user_id: string;
  room_name: string;
  visibility: 'public' | 'contacts';
  started_at: string;
  ended_at: string | null;
  display_name: string | null;
};

export type UserMilestone = {
  id: string;
  user_id: string;
  milestone_key: string;
  achieved_at: string;
};

export type NotifSettings = {
  proximity_radius_m: number;
  notify_nearby_pins: boolean;
  notify_sos_nearby: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  notify_followed_pins: boolean;
  notify_milestones: boolean;
};

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  proximity_radius_m: 1000,
  notify_nearby_pins: true,
  notify_sos_nearby: true,
  quiet_hours_enabled: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
  notify_followed_pins: true,
  notify_milestones: true,
};

export type UserReport = {
  id: string;
  reporter_id: string;
  target_type: 'pin' | 'user' | 'message' | 'story';
  target_id: string;
  reason: 'spam' | 'false_report' | 'offensive' | 'duplicate';
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
};

export type SubscriptionPlan = 'free' | 'pro' | 'pro_annual';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';

export type Subscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  description: string | null;
  invoice_pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

export type AdminParam = {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
};

export type DayHours = {
  closed: boolean;
  open?: string;   // "HH:MM"
  close?: string;  // "HH:MM"
  breakStart?: string;
  breakEnd?: string;
};

export type SafeSpace = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'pharmacy' | 'hospital' | 'police' | 'cafe' | 'shelter';
  source: 'overpass' | 'user' | 'simulated';
  verified: boolean;
  upvotes: number;
  is_simulated?: boolean;
  created_by: string | null;
  created_at: string;
  // Partner fields (S44)
  address: string | null;
  phone: string | null;
  contact_name: string | null;
  description: string | null;
  website: string | null;
  photo_urls: string[];
  opening_hours: Record<string, string | DayHours> | null;
  is_partner: boolean;
  partner_since: string | null;
  partner_tier: 'basic' | 'premium' | null;
};

export type SafeSpaceMedia = {
  id: string;
  safe_space_id: string;
  user_id: string;
  type: 'photo' | 'video' | 'review';
  media_url?: string;
  caption?: string;
  likes_count: number;
  created_at: string;
  profiles?: { name: string; avatar_url?: string };
};

export type SafeSpaceVote = {
  id: string;
  safe_space_id: string;
  user_id: string;
  created_at: string;
};

export type SavedPlace = {
  id: string;
  user_id: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  icon: string;
  category: 'home' | 'work' | 'cafe' | 'safe_space' | 'health' | 'sport' | 'other';
  is_pinned: boolean;
  created_at: string;
  distance_km?: number; // computed client-side
};

export type PlaceNote = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  name: string | null;
  note: string;
  emoji: string;
  created_at: string;
};

export type TripLog = {
  id: string;
  user_id: string;
  from_label: string | null;
  to_label: string;
  mode: string;
  danger_score: number;
  distance_m: number;
  duration_s: number;
  started_at: string;
  ended_at: string;
};

export type Profile = {
  id: string;
  name: string;
  display_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  date_of_birth?: string | null;
  persona?: 'solo_traveler' | 'night_worker' | 'student' | 'commuter' | 'parent' | null;
  phone?: string | null;
  onboarding_goals?: number[];
  onboarding_step?: number;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  verified?: boolean;
  verification_deadline?: string | null;
  blocked_reason?: string | null;
  is_shadow_banned?: boolean;
  is_admin?: boolean;
  is_support?: boolean;
  is_simulated?: boolean;
  sim_places?: Array<{ lat: number; lng: number; label: string; role: string }> | null;
  current_streak?: number;
  longest_streak?: number;
  last_active_date?: string | null;
  created_at: string;
};

export type EngagementEvent = {
  id: string;
  user_id: string;
  event_type: 'signup' | 'login' | 'pin_created' | 'vote_cast' | 'comment_posted' | 'route_planned' | 'sos_triggered' | 'verification_started' | 'verification_completed' | 'streak_milestone';
  metadata: Record<string, unknown>;
  created_at: string;
};

export type EmergencyDispatch = {
  id: string;
  user_id: string;
  pin_id: string;
  contacts_notified: string[];
  sms_sent: boolean;
  resolved_at: string | null;
  created_at: string;
};

export type EmergencySession = {
  id: string;
  user_id: string;
  pin_id: string;
  display_name: string | null;
  location_trail: { lat: number; lng: number; ts: string }[];
  resolved_at: string | null;
  created_at: string;
};

// S44: Confirm & Thank
export type PinThank = {
  id: string;
  pin_id: string;
  user_id: string;
  created_at: string;
};

// S45: Walk With Me
export type WalkSession = {
  id: string;
  creator_id: string;
  companion_id: string | null;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  invite_code: string | null;
  destination: string | null;
  started_at: string | null;
  ended_at: string | null;
  next_checkin_at: string | null;
  created_at: string;
};

// S47: Shared Safe Routes
export type RouteUpvote = {
  id: string;
  route_id: string;
  user_id: string;
  created_at: string;
};

// S48: Guardian Challenges
export type Challenge = {
  id: string;
  title: string;
  emoji: string;
  description: string | null;
  challenge_type: 'votes' | 'reports' | 'routes' | 'comments' | 'communities' | 'streak';
  target_value: number;
  reward_points: number;
  week_start: string;
  is_active: boolean;
  created_at: string;
};

export type UserChallenge = {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  completed_at: string | null;
  created_at: string;
};

// S50: SOS Responder
export type SosResponder = {
  id: string;
  pin_id: string;
  responder_id: string;
  status: 'on_way' | 'arrived' | 'left';
  lat: number | null;
  lng: number | null;
  created_at: string;
};

// S51: Audio Check-in
export type AudioCheckin = {
  id: string;
  user_id: string;
  session_type: 'emergency' | 'trip' | 'walk';
  session_id: string | null;
  audio_url: string;
  duration_s: number | null;
  transcript: string | null;
  created_at: string;
};

export const CATEGORIES = {
  harassment: { label: 'Harassment', emoji: '😰' },
  stalking: { label: 'Stalking', emoji: '👁' },
  aggression: { label: 'Aggression', emoji: '⚡' },
  theft: { label: 'Theft', emoji: '💰' },
  verbal_abuse: { label: 'Verbal abuse', emoji: '🗣️' },
  poor_lighting: { label: 'Poor lighting', emoji: '🌑' },
  dark_area: { label: 'Poor lighting', emoji: '🌑' }, // legacy alias
  unsafe_road: { label: 'Unsafe road', emoji: '🚧' },
  isolated: { label: 'Isolated area', emoji: '🏚️' },
  drunk: { label: 'Intoxicated', emoji: '🍺' },
  suspicious: { label: 'Suspicious', emoji: '🔍' },
  other: { label: 'Other', emoji: '⚠️' },
  obstacle: { label: 'Obstacle', emoji: '🚧' },
  construction: { label: 'Construction', emoji: '👷' },
  bad_parking: { label: 'Bad parking', emoji: '🚗' },
  accident: { label: 'Accident', emoji: '💥' },
  medical_emergency: { label: 'Medical emergency', emoji: '🚑' },
  fire: { label: 'Fire', emoji: '🔥' },
  flood: { label: 'Flood', emoji: '🌊' },
} as const;

/** Categories shown in the report form (excludes legacy aliases) */
export const REPORT_CATEGORIES = {
  harassment: CATEGORIES.harassment,
  stalking: CATEGORIES.stalking,
  aggression: CATEGORIES.aggression,
  theft: CATEGORIES.theft,
  verbal_abuse: CATEGORIES.verbal_abuse,
  poor_lighting: CATEGORIES.poor_lighting,
  unsafe_road: CATEGORIES.unsafe_road,
  isolated: CATEGORIES.isolated,
  drunk: CATEGORIES.drunk,
  suspicious: CATEGORIES.suspicious,
  other: CATEGORIES.other,
} as const;

export const ENVIRONMENTS = {
  foot:    { label: 'On foot',  emoji: '🚶' },
  metro:   { label: 'Transit',  emoji: '🚇' },
  bus:     { label: 'Bus',      emoji: '🚌' },
  cycling: { label: 'Cycling',  emoji: '🚲' },
  car:     { label: 'Vehicle',  emoji: '🚗' },
  indoor:  { label: 'Indoor',   emoji: '🏠' },
} as const;

export const SEVERITY = {
  low: { label: 'Mild',     emoji: '😟', color: '#10b981' },
  med: { label: 'Moderate', emoji: '⚠️', color: '#f59e0b' },
  high: { label: 'Danger',  emoji: '🚨', color: '#f43f5e' },
} as const;

export const URBAN_CONTEXTS = {
  street:     { label: 'Street',          emoji: '🛣️' },
  parking:    { label: 'Parking',         emoji: '🅿️' },
  store:      { label: 'Store / Mall',    emoji: '🏪' },
  metro:      { label: 'Metro',           emoji: '🚇' },
  bus:        { label: 'Bus stop',        emoji: '🚌' },
  park:       { label: 'Park',            emoji: '🌳' },
  restaurant: { label: 'Restaurant / Bar', emoji: '🍽️' },
  building:   { label: 'Building',        emoji: '🏢' },
  other:      { label: 'Other',           emoji: '📍' },
} as const;

// ════════════════════════════════════════════════════════════════════
// CATEGORY SYSTEM (v2 — grouped by severity)
// ════════════════════════════════════════════════════════════════════

export const CATEGORY_GROUPS = {
  urgent: {
    id: 'urgent',
    label: 'URGENT',
    color: { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    items: ['assault', 'harassment', 'theft', 'following'],
    decayHours: 24,
  },
  warning: {
    id: 'warning',
    label: 'ATTENTION',
    color: { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    items: ['suspect', 'group', 'unsafe'],
    decayHours: 12,
  },
  infra: {
    id: 'infra',
    label: 'INFRASTRUCTURE',
    color: { text: '#64748B', bg: 'rgba(148,163,184,0.12)' },
    items: ['lighting', 'blocked', 'closed'],
    decayHours: 168,
  },
  positive: {
    id: 'positive',
    label: 'POSITIF',
    color: { text: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    items: ['safe', 'help', 'presence'],
    decayHours: 720,
  },
} as const;

export type CategoryGroupId = keyof typeof CATEGORY_GROUPS;

export const CATEGORY_DETAILS: Record<string, {
  emoji: string;
  label: string;
  group: CategoryGroupId;
}> = {
  assault: { emoji: '🚨', label: 'Agression', group: 'urgent' },
  harassment: { emoji: '🚫', label: 'Harcèlement', group: 'urgent' },
  theft: { emoji: '👜', label: 'Vol', group: 'urgent' },
  following: { emoji: '👤', label: 'Filature', group: 'urgent' },
  suspect: { emoji: '👁️', label: 'Suspect', group: 'warning' },
  group: { emoji: '👥', label: 'Attroupement', group: 'warning' },
  unsafe: { emoji: '⚠️', label: 'Zone à éviter', group: 'warning' },
  lighting: { emoji: '💡', label: 'Mal éclairé', group: 'infra' },
  blocked: { emoji: '🚧', label: 'Passage difficile', group: 'infra' },
  closed: { emoji: '🚷', label: 'Fermé', group: 'infra' },
  safe: { emoji: '💚', label: 'Lieu sûr', group: 'positive' },
  help: { emoji: '🙋', label: 'Aide reçue', group: 'positive' },
  presence: { emoji: '👮', label: 'Sécurité', group: 'positive' },
};

export const TRANSPORT_TYPES = [
  { id: 'metro', emoji: '🚇', label: 'Métro', placeholder: 'Ligne (4, 11...)' },
  { id: 'rer', emoji: '🚆', label: 'RER', placeholder: 'Ligne (A, B...)' },
  { id: 'bus', emoji: '🚌', label: 'Bus', placeholder: 'N° (72, 91...)' },
  { id: 'tram', emoji: '🚊', label: 'Tram', placeholder: 'Ligne' },
] as const;

// ════════════════════════════════════════════════════════════════════
// TIME DECAY
// ════════════════════════════════════════════════════════════════════

export const DECAY_HOURS: Record<string, number> = {
  assault: 24,
  harassment: 24,
  theft: 24,
  following: 24,
  suspect: 12,
  group: 12,
  unsafe: 48,
  lighting: 168,
  blocked: 168,
  closed: 168,
  safe: 720,
  help: 720,
  presence: 720,
};

// ════════════════════════════════════════════════════════════════════
// EMAIL LOGS
// ════════════════════════════════════════════════════════════════════

export type EmailLog = {
  id: string;
  user_id: string;
  email_type: string;
  recipient: string;
  status: 'sent' | 'failed';
  resend_id: string | null;
  error_message: string | null;
  created_at: string;
};
