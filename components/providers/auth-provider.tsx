'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { SupabaseService } from '@/lib/services/supabase-service';
import { writeLocaleCookie, readLocaleCookie } from '@/lib/i18n/locale-cookie';
import { isLocale } from '@/i18n/routing';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);
  const fetchJobTypes = useJobTypesStore(state => state.fetchJobTypes);
  const userId = useAuthStore(state => state.session.userId);
  const isAuthenticated = useAuthStore(state => state.session.isAuthenticated);
  const currentLocale = useLocale();
  const syncedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    initialize();
    fetchJobTypes();
  }, [initialize, fetchJobTypes]);

  // Sync app_language between user_settings (source of truth) and the locale
  // cookie (per-render SSR mirror).
  //
  // - If a user_settings row exists, the cookie and the rendered locale are
  //   aligned to its app_language; a one-shot reload picks up new messages
  //   on the server if needed.
  // - If no row exists yet (legacy user from before the table existed),
  //   seed one from the current cookie locale so the UI keeps showing what
  //   the user was already seeing, and the row will be the canonical answer
  //   for every future device.
  //
  // Runs at most once per user per session.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (syncedForUserRef.current === userId) return;
    syncedForUserRef.current = userId;
    let cancelled = false;
    (async () => {
      try {
        const settings = await SupabaseService.fetchUserSettings();
        if (cancelled) return;

        let dbLocale = settings?.app_language;
        if (!isLocale(dbLocale)) {
          // No row yet — seed from the current cookie locale (or the
          // currently rendered locale as a fallback). Failing the upsert
          // shouldn't break the app, just leave the cookie in charge.
          const seedLocale = isLocale(readLocaleCookie())
            ? readLocaleCookie()!
            : isLocale(currentLocale) ? currentLocale : 'de';
          try {
            const created = await SupabaseService.upsertUserSettings({ app_language: seedLocale });
            dbLocale = created?.app_language ?? seedLocale;
          } catch (err) {
            console.error('Failed to seed user_settings:', err);
            return;
          }
        }
        if (cancelled || !isLocale(dbLocale)) return;

        const cookieLocale = readLocaleCookie();
        if (cookieLocale !== dbLocale) writeLocaleCookie(dbLocale);
        if (currentLocale !== dbLocale && typeof window !== 'undefined') {
          window.location.reload();
        }
      } catch (err) {
        console.error('Failed to sync user locale:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, currentLocale]);

  return <>{children}</>;
}
