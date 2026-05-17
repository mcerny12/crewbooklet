import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  FileText,
  CalendarDays,
  Search,
  Settings as SettingsIcon,
} from 'lucide-react';

export type NavVisibility = 'all' | 'desktop-only' | 'mobile-only';

/**
 * `labelKey` is a translation key under the `navigation` namespace.
 * Components rendering nav items must translate it via `useTranslations('navigation')`.
 */
export type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  visibility?: NavVisibility;
};

export const primaryNavItems: NavItem[] = [
  { href: '/', labelKey: 'dashboard', icon: LayoutDashboard, exact: true },
  { href: '/people', labelKey: 'people', icon: Users },
  { href: '/projects', labelKey: 'projects', icon: Briefcase },
  { href: '/organizations', labelKey: 'organizations', icon: Building2 },
  { href: '/invoices', labelKey: 'invoices', icon: FileText, visibility: 'desktop-only' },
  { href: '/calendar', labelKey: 'calendar', icon: CalendarDays },
  { href: '/search', labelKey: 'search', icon: Search, visibility: 'mobile-only' },
  { href: '/settings', labelKey: 'settings', icon: SettingsIcon },
];

/**
 * @deprecated Admin functionality now lives inside `/settings` as admin-only
 * sections (gated by `usePermissions().isAdmin` in the UI and by
 * `assertAdmin()` server-side in /api/admin/*). Kept as an empty export so
 * legacy imports keep building during the transition; remove once no
 * consumers reference it.
 */
export const adminNavItems: NavItem[] = [];

export function isNavItemActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getVisibleNavItems(items: NavItem[], isMobile: boolean): NavItem[] {
  return items.filter((item) => {
    if (item.visibility === 'desktop-only') return !isMobile;
    if (item.visibility === 'mobile-only') return isMobile;
    return true;
  });
}
