// src/i18n/routing.ts

import { defineRouting } from 'next-intl/routing';

export const LOCALES = [
  'en', 'fr', 'es', 'zh', 'ar', 'hi', 'pt', 'bn', 'ru', 'ja',
  'de', 'ko', 'it', 'tr', 'vi', 'pl', 'nl', 'th', 'sv', 'ro',
  'cs', 'el', 'hu', 'da', 'fi', 'no', 'he', 'id', 'ms', 'uk',
] as const;

export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});
