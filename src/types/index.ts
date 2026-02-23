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
  category: 'harassment' | 'stalking' | 'dark_area' | 'aggression' | 'drunk' | 'other';
  severity: 'low' | 'med' | 'high';
  description: string;
  photo_url: string | null;
  environment: string | null;
  urban_context: string | null;
  urban_context_custom: string | null;
  is_moving: boolean | null;
  media_urls: MediaItem[] | null;
  is_emergency: boolean;
  resolved_at: string | null;
  last_confirmed_at: string | null;
  flag_count?: number;
  hidden_at?: string | null;
  is_simulated?: boolean;
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
  type: 'emergency' | 'vote' | 'comment' | 'resolve' | 'community' | 'trusted_contact' | 'milestone' | 'digest';
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

export type SafeSpace = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'pharmacy' | 'hospital' | 'police' | 'cafe' | 'shelter';
  source: 'overpass' | 'user';
  verified: boolean;
  upvotes: number;
  created_by: string | null;
  created_at: string;
  // Partner fields (S44)
  address: string | null;
  phone: string | null;
  contact_name: string | null;
  description: string | null;
  website: string | null;
  photo_urls: string[];
  opening_hours: Record<string, string> | null;
  is_partner: boolean;
  partner_since: string | null;
  partner_tier: 'basic' | 'premium' | null;
};

export type SafeSpaceVote = {
  id: string;
  safe_space_id: string;
  user_id: string;
  created_at: string;
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
  is_shadow_banned?: boolean;
  is_simulated?: boolean;
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
  dark_area: { label: 'Dark area', emoji: '🌑' },
  aggression: { label: 'Aggression', emoji: '⚡' },
  drunk: { label: 'Intoxicated', emoji: '🍺' },
  other: { label: 'Other', emoji: '⚠️' },
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
