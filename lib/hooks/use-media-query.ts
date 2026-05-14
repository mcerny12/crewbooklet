'use client';

import * as React from 'react';

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = React.useState(defaultValue);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)', false);
}

export function useIsTabletOrMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)', false);
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)', false);
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)', true);
}
