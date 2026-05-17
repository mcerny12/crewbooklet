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

  // Sync app_language from user_settings to the locale cookie on sign-in.
  // The DB is the source of truth across devices; the cookie is a per-render
  // SSR mirror. If the cookie already matches the DB value, we don't reload.
  // If it doesn't, we update the cookie and reload once so next-intl picks
  // up the correct messages on the server. Runs at most once per user.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (syncedForUserRef.current === userId) return;
    syncedForUserRef.current = userId;
    let cancelled = false;
    SupabaseService.fetchUserSettings().then((settings) => {
      if (cancelled) return;
      const dbLocale = settings?.app_language;
      if (!isLocale(dbLocale)) return;
      const cookieLocale = readLocaleCookie();
      if (cookieLocale === dbLocale && currentLocale === dbLocale) return;
      writeLocaleCookie(dbLocale);
      if (currentLocale !== dbLocale && typeof window !== 'undefined') {
        window.location.reload();
      }
    }).catch((err) => console.error('Failed to sync user locale:', err));
    return () => { cancelled = true; };
  }, [isAuthenticated, userId, currentLocale]);

  return <>{children}</>;
}
