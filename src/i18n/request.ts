// src/i18n/request.ts

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALES } from './routing';
import en from '../messages/en.json';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)
    ? cookieLocale
    : 'en';

  // Dynamic import for non-English locales; merge with English as fallback
  let messages: typeof en = en;
  if (locale !== 'en') {
    try {
      const localeMessages = (await import(`../messages/${locale}.json`)).default;
      // Deep merge: locale-specific overrides English
      messages = deepMerge(en, localeMessages);
    } catch {
      // If locale file missing, fall back to English
    }
  }

  return { locale, messages };
});

function deepMerge<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    if (
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key]) &&
      typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, override[key] as Record<string, unknown>);
    } else {
      result[key] = override[key];
    }
  }
  return result as T;
}
