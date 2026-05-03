'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Briefcase, Building2, Calendar, LogOut, LayoutDashboard, FileText, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserRole, UserRoleDisplay } from '@/lib/types/models';

const navigationItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/people', label: 'People', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
];

const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.Admin]: 'bg-red-100 text-red-700',
  [UserRole.User]: 'bg-blue-100 text-blue-700',
  [UserRole.Viewer]: 'bg-gray-100 text-gray-600',
};

export function Sidebar() {
  const pathname = usePathname();
  const signOut = useAuthStore(state => state.signOut);
  const session = useAuthStore(state => state.session);
  const { isAdmin } = usePermissions();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-6">
        <h1 className="text-2xl font-bold">CrewBooklet</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {session.email}
        </p>
        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_BADGE[session.role]}`}>
          {UserRoleDisplay[session.role]}
        </span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4">
        <Separator className="mb-4" />
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1 ${
              pathname === '/admin'
                ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Shield className="h-5 w-5" />
            User Management
          </Link>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
