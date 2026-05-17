import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, type Locale } from '@/i18n/routing';

/**
 * Read the locale cookie from `document.cookie` (client-only).
 * Returns `null` if missing or invalid.
 */
export function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.split('=')[1] ?? '');
  return isLocale(value) ? value : null;
}

/**
 * Persist the locale cookie on the client. The cookie is read server-side
 * by `i18n/request.ts` so a full reload after setting it is required for
 * server-rendered messages to update.
 */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = [
    `${LOCALE_COOKIE}=${encodeURIComponent(locale)}`,
    'path=/',
    `max-age=${LOCALE_COOKIE_MAX_AGE}`,
    'samesite=lax',
  ].join('; ');
}
