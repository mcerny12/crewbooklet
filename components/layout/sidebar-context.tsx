'use client';

import * as React from 'react';

const SIDEBAR_STORAGE_KEY = 'crewbooklet:sidebar:desktopOpen';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

type SidebarContextValue = {
  desktopOpen: boolean;
  mobileOpen: boolean;
  isDesktop: boolean;
  collapsed: boolean;
  mounted: boolean;
  setDesktopOpen: (open: boolean) => void;
  toggleDesktop: () => void;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const isDesktopRaw = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const [desktopOpen, setDesktopOpenState] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setDesktopOpenState(stored === 'true');
    }
    setMounted(true);
  }, []);

  const setDesktopOpen = React.useCallback((open: boolean) => {
    setDesktopOpenState(open);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  }, []);

  const toggleDesktop = React.useCallback(() => {
    setDesktopOpenState(current => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // During SSR and the first client render, render as expanded desktop
  // to keep server and client markup identical (no hydration mismatch
  // and no FOUC).
  const isDesktop = mounted ? isDesktopRaw : true;
  const effectiveDesktopOpen = mounted ? desktopOpen : true;

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      desktopOpen: effectiveDesktopOpen,
      mobileOpen,
      isDesktop,
      collapsed: isDesktop ? !effectiveDesktopOpen : false,
      mounted,
      setDesktopOpen,
      toggleDesktop,
      setMobileOpen,
    }),
    [effectiveDesktopOpen, mobileOpen, isDesktop, mounted, setDesktopOpen, toggleDesktop],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
