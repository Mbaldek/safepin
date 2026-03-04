// src/__tests__/setup.ts — Test setup: mock Supabase, Mapbox, next-intl

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ data: [], error: null }), data: [], error: null }),
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

// Mock mapbox-gl
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(),
    Marker: vi.fn(() => ({ setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis(), remove: vi.fn() })),
    Popup: vi.fn(() => ({ setLngLat: vi.fn().mockReturnThis(), setHTML: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis() })),
    accessToken: '',
  },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, {
      get: (_target, prop: string) => {
        // Return a forwardRef component for any motion.xxx element
        const MotionComponent = React.forwardRef(function MotionProxy(props: Record<string, unknown>, ref: unknown) {
          const filteredProps: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(props)) {
            if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'layout', 'layoutId', 'variants'].includes(key)) {
              filteredProps[key] = value;
            }
          }
          return React.createElement(prop, { ...filteredProps, ref });
        });
        return MotionComponent;
      },
    }),
  };
});
