// src/i18n/request.ts

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import en from '../messages/en.json';
import fr from '../messages/fr.json';

const LOCALES = ['en', 'fr'] as const;
const DEFAULT_LOCALE = 'en';
const allMessages: Record<string, typeof en> = { en, fr };

export default getRequestConfig(async () => {
  // Read locale from cookie set by proxy.ts
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)
    ? cookieLocale
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: allMessages[locale] ?? allMessages.en,
  };
});
