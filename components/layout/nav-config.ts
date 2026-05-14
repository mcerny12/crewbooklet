import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  FileText,
  CalendarDays,
  Shield,
  Search,
} from 'lucide-react';

export type NavVisibility = 'all' | 'desktop-only' | 'mobile-only';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  visibility?: NavVisibility;
};

export const primaryNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/people', label: 'People', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/invoices', label: 'Invoices', icon: FileText, visibility: 'desktop-only' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/search', label: 'Search', icon: Search, visibility: 'mobile-only' },
];

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'User Management', icon: Shield },
];

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
