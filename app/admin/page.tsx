'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';

/**
 * Legacy /admin route. Admin functionality moved into /settings as admin-only
 * sections. Redirect:
 *  - admins → /settings?section=admin-users
 *  - everyone else → /settings (which shows only their general settings)
 *
 * The downstream Settings UI hides admin sections and the /api/admin/* API
 * still rejects non-admin callers, so this is a UX redirect, not an
 * authorisation boundary.
 */
export default function AdminPage() {
  const router = useRouter();
  const { isAdmin } = usePermissions();

  useEffect(() => {
    router.replace(isAdmin ? '/settings?section=admin-users' : '/settings');
  }, [isAdmin, router]);

  return null;
}
