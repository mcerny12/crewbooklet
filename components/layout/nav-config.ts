import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  FileText,
  CalendarDays,
  Shield,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

export const primaryNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/people', label: 'People', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'User Management', icon: Shield },
];

export function isNavItemActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
