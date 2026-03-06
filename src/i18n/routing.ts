// src/i18n/routing.ts

import { defineRouting } from 'next-intl/routing';

export const LOCALES = ['en', 'fr'] as const;

export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});
