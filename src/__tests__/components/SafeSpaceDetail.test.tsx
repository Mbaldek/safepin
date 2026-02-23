// src/__tests__/components/SafeSpaceDetail.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SafeSpaceDetailSheet from '@/components/SafeSpaceDetailSheet';
import { useStore } from '@/stores/useStore';
import type { SafeSpace } from '@/types';

// The global setup (setup.ts) already mocks:
// - @/lib/supabase (with chainable from/select/eq/insert/update)
// - next-intl (useTranslations returns key as value)
// - framer-motion (AnimatePresence passthrough, motion.div → real div)

// Override the supabase mock to handle maybeSingle() used by this component
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SafeSpaceDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ userId: 'test-user-id' });
  });

  it('renders nothing when space is null', () => {
    const { container } = render(
      <SafeSpaceDetailSheet space={null} onClose={vi.fn()} />,
    );
    // AnimatePresence renders children only when space is truthy
    expect(container.innerHTML).toBe('');
  });

  it('renders the space name when space is provided', () => {
    const space = createMockSpace({ name: 'Safe Haven Cafe' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Safe Haven Cafe')).toBeInTheDocument();
  });

  it('renders the space type as a translated key', () => {
    const space = createMockSpace({ type: 'hospital' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    // useTranslations mock returns the key itself, so t('hospital') → 'hospital'
    expect(screen.getByText(/hospital/)).toBeInTheDocument();
  });

  it('renders the address when provided', () => {
    const space = createMockSpace({ address: '42 Avenue des Champs-Elysees' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('42 Avenue des Champs-Elysees')).toBeInTheDocument();
  });

  it('does not render address section when address is null', () => {
    const space = createMockSpace({ address: null });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.queryByText('42 Avenue des Champs-Elysees')).not.toBeInTheDocument();
  });

  it('shows partner badge for partner spaces with basic tier', () => {
    const space = createMockSpace({
      is_partner: true,
      partner_tier: 'basic',
    });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Partner')).toBeInTheDocument();
  });

  it('shows Premium Partner badge for premium tier', () => {
    const space = createMockSpace({
      is_partner: true,
      partner_tier: 'premium',
    });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Premium Partner')).toBeInTheDocument();
  });

  it('does not show partner badge when is_partner is false', () => {
    const space = createMockSpace({ is_partner: false, partner_tier: null });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.queryByText('Partner')).not.toBeInTheDocument();
    expect(screen.queryByText('Premium Partner')).not.toBeInTheDocument();
  });

  it('shows the upvote button', () => {
    const space = createMockSpace({ upvotes: 5 });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText(/Upvote/)).toBeInTheDocument();
  });

  it('displays upvote count when greater than 0', () => {
    const space = createMockSpace({ upvotes: 87, phone: null });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText(/87/)).toBeInTheDocument();
  });

  it('shows the "Get Directions" button', () => {
    const space = createMockSpace();
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Get Directions')).toBeInTheDocument();
  });

  it('has a dialog with proper aria attributes', () => {
    const space = createMockSpace();
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Safe space details');
  });

  it('shows the Close button', () => {
    const space = createMockSpace();
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows close icon button with aria-label', () => {
    const space = createMockSpace();
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('renders phone number as a link when provided', () => {
    const space = createMockSpace({ phone: '+33 1 00 00 00 00' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    const phoneLink = screen.getByText('+33 1 00 00 00 00');
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink.closest('a')).toHaveAttribute('href', 'tel:+33 1 00 00 00 00');
  });

  it('renders description when provided', () => {
    const space = createMockSpace({ description: 'A safe and welcoming place for everyone.' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('A safe and welcoming place for everyone.')).toBeInTheDocument();
  });

  it('renders website link when provided', () => {
    const space = createMockSpace({ website: 'https://example.com' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Website')).toBeInTheDocument();
  });

  it('shows Verified badge for verified spaces', () => {
    const space = createMockSpace({ verified: true });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows Community badge for user-sourced spaces', () => {
    const space = createMockSpace({ source: 'user' });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('shows contact name for partner spaces', () => {
    const space = createMockSpace({
      is_partner: true,
      partner_tier: 'basic',
      contact_name: 'Jean Dupont',
    });
    render(<SafeSpaceDetailSheet space={space} onClose={vi.fn()} />);
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });
});
