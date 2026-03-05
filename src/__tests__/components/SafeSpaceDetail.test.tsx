// src/__tests__/components/SafeSpaceDetail.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SafeSpaceDetailSheet from '@/components/SafeSpaceDetailSheet';
import type { SafeSpace } from '@/types';

// The global setup (setup.ts) already mocks:
// - @/lib/supabase (with chainable from/select/eq/insert/update)
// - next-intl (useTranslations returns key as value)
// - framer-motion (AnimatePresence passthrough, motion.div → real div)

// Override the supabase mock to handle the queries used by this component
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          data: [],
          error: null,
        }),
        data: [],
        error: null,
      }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }), data: null, error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: Object.assign((() => {}) as unknown as Record<string, unknown>, {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSpace(overrides: Partial<SafeSpace> = {}): SafeSpace {
  return {
    id: 'space-1',
    lat: 48.856,
    lng: 2.352,
    name: 'Test Pharmacy',
    type: 'pharmacy',
    source: 'overpass',
    verified: false,
    upvotes: 12,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    address: '12 Rue de Rivoli, 75001 Paris',
    phone: '+33 1 42 33 44 55',
    contact_name: null,
    description: null,
    website: null,
    photo_urls: [],
    opening_hours: null,
    is_partner: false,
    partner_since: null,
    partner_tier: null,
    ...overrides,
  };
}

function renderSheet(space: SafeSpace) {
  return render(
    <SafeSpaceDetailSheet
      safeSpace={space}
      userId="test-user-id"
      isOpen={true}
      onClose={vi.fn()}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SafeSpaceDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the space name', () => {
    renderSheet(createMockSpace({ name: 'Safe Haven Cafe' }));
    expect(screen.getByText('Safe Haven Cafe')).toBeInTheDocument();
  });

  it('renders the address when provided', () => {
    renderSheet(createMockSpace({ address: '42 Avenue des Champs-Elysees' }));
    expect(screen.getByText('42 Avenue des Champs-Elysees')).toBeInTheDocument();
  });

  it('does not render address when address is null', () => {
    renderSheet(createMockSpace({ address: null }));
    expect(screen.queryByText('42 Avenue des Champs-Elysees')).not.toBeInTheDocument();
  });

  it('shows Premium Partner badge for premium tier', () => {
    renderSheet(createMockSpace({ is_partner: true, partner_tier: 'premium' }));
    expect(screen.getByText(/Premium Partner/)).toBeInTheDocument();
  });

  it('shows Vérifié badge when verified', () => {
    renderSheet(createMockSpace({ verified: true }));
    expect(screen.getByText(/Vérifié/)).toBeInTheDocument();
  });

  it('shows the upvote button with count', () => {
    renderSheet(createMockSpace({ upvotes: 87 }));
    expect(screen.getByText(/87 Upvote/)).toBeInTheDocument();
  });

  it('shows the navigate button', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText(/S.y rendre maintenant/)).toBeInTheDocument();
  });

  it('shows the share button', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText('Partager ce lieu')).toBeInTheDocument();
  });

  it('shows the UGC section header', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText('Contenus de la communauté')).toBeInTheDocument();
  });

  it('shows the add content button', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText('+ Ajouter')).toBeInTheDocument();
  });

  it('shows safety score section', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText('Score de sécurité')).toBeInTheDocument();
  });

  it('shows the close button', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('renders Safe Space badge', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText(/Safe Space/)).toBeInTheDocument();
  });

  it('shows Communauté tag', () => {
    renderSheet(createMockSpace());
    expect(screen.getByText(/Communauté/)).toBeInTheDocument();
  });
});
