'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';

/**
 * Legacy /admin route. Admin functionality moved into /settings as admin-only
 * sections. proxy.ts (active server-side middleware in Next.js 16 — see
 * CLAUDE.md) already redirects non-admins to /settings before this component
 * ever mounts, so in practice only admins reach this client-side effect:
 *  - admins → /settings?section=admin-users
 *
 * The downstream Settings UI hides admin sections and the /api/admin/* API
 * still rejects non-admin callers, so this remains a UX redirect, not the
 * sole authorisation boundary.
 */
export default function AdminPage() {
  const router = useRouter();
  const { isAdmin } = usePermissions();

  useEffect(() => {
    router.replace(isAdmin ? '/settings?section=admin-users' : '/settings');
  }, [isAdmin, router]);

  return null;
}
