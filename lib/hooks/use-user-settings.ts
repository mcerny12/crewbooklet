/**
 * useUserSettings — load and mutate the current user's settings.
 *
 * Fetches once per authenticated user; exposes the current settings,
 * a loading flag, and a typed updater that upserts to Supabase, mirrors
 * the app_language change into the locale cookie (for SSR), and reloads
 * the page so next-intl picks up the new messages on the server.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { SupabaseService } from '@/lib/services/supabase-service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { writeLocaleCookie } from '@/lib/i18n/locale-cookie';
import {
  DEFAULT_USER_SETTINGS,
  type AppLanguage,
  type UserSettings,
} from '@/lib/types/models';

type EditableSettings = Partial<Pick<UserSettings, 'app_language'>>;

export function useUserSettings() {
  const userId = useAuthStore((s) => s.session.userId);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch when a user is logged in. State updates only happen inside async
  // callbacks (then/catch/finally) — never synchronously in the effect body
  // — so the eslint rule against cascading renders in effects is satisfied.
  // The consumer derives `isLoading` from whether a fetch has completed.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    SupabaseService.fetchUserSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const isLoading = !!userId && !loaded;

  const update = useCallback(async (updates: EditableSettings) => {
    const next = await SupabaseService.upsertUserSettings(updates);
    if (next) setSettings(next);
    return next;
  }, []);

  const setAppLanguage = useCallback(
    async (lang: AppLanguage) => {
      const next = await update({ app_language: lang });
      // Mirror to the cookie so the next server render uses the new locale,
      // then reload — next-intl reads the cookie at render time.
      writeLocaleCookie(lang);
      if (typeof window !== 'undefined') window.location.reload();
      return next;
    },
    [update]
  );

  return {
    settings,
    appLanguage: (settings?.app_language ?? DEFAULT_USER_SETTINGS.app_language) as AppLanguage,
    isLoading,
    error,
    update,
    setAppLanguage,
  };
}
