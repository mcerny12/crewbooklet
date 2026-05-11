'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useJobTypesStore } from '@/lib/stores/job-types-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);
  const fetchJobTypes = useJobTypesStore(state => state.fetchJobTypes);

  useEffect(() => {
    initialize();
    fetchJobTypes();
  }, [initialize, fetchJobTypes]);

  return <>{children}</>;
}
