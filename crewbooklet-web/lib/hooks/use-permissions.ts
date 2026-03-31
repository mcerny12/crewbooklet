/**
 * usePermissions
 * Returns boolean flags based on the current user's role.
 *
 * admin  → full access
 * user   → can create, edit, delete their own records
 * viewer → read-only (no create / edit / delete)
 */

import { useAuthStore } from '@/lib/stores/auth-store';
import { UserRole } from '@/lib/types/models';

export function usePermissions() {
  const role = useAuthStore((s) => s.session.role);

  const isAdmin = role === UserRole.Admin;
  const isViewer = role === UserRole.Viewer;

  return {
    isAdmin,
    isViewer,
    canCreate: !isViewer,
    canEdit: !isViewer,
    canDelete: !isViewer,
  };
}
