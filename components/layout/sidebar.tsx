'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, Briefcase, Building2, Calendar, LogOut,
  LayoutDashboard, FileText, Shield, Film,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { UserRole } from '@/lib/types/models';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  [UserRole.Admin]:  { label: 'Admin',  className: 'bg-blue-100 text-blue-700' },
  [UserRole.User]:   { label: 'User',   className: 'bg-slate-100 text-slate-600' },
  [UserRole.Viewer]: { label: 'Viewer', className: 'bg-slate-100 text-slate-500' },
};

const STORAGE_KEY = 'crewbooklet-sidebar-collapsed';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
}

function NavItem({ href, icon: Icon, label, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex items-center h-9 rounded-lg text-[13.5px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
        active
          ? 'bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--color-primary)]'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon
        aria-hidden
        className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground/70')}
      />
      {!collapsed && label}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
      {label}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const signOut = useAuthStore(state => state.signOut);
  const session = useAuthStore(state => state.session);
  const { isAdmin } = usePermissions();

  // Lazy initializer reads persisted state once on the client; SSR pass gets `false`.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore localStorage write errors
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const roleMeta = ROLE_BADGE[session.role] ?? ROLE_BADGE[UserRole.Viewer];
  const initials = session.email ? session.email.slice(0, 2).toUpperCase() : '??';

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-[width] duration-200 ease-out',
        collapsed ? 'w-14' : 'w-63',
      )}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center shrink-0 py-5',
          collapsed ? 'flex-col gap-2 px-0' : 'gap-3 px-5',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Film className="h-4 w-4" aria-hidden />
        </div>
        {!collapsed && (
          <span className="text-[16px] font-bold tracking-tight flex-1 truncate">
            CrewBooklet
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70',
            'hover:bg-accent hover:text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <div className={cn('border-b', collapsed ? 'mx-2' : 'mx-4')} />

      {/* ── User profile ──────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center shrink-0 py-3',
          collapsed ? 'justify-center px-0' : 'gap-3 px-4',
        )}
      >
        <div
          aria-hidden
          title={collapsed ? session.email ?? undefined : undefined}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
        >
          {initials}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-muted-foreground leading-tight">{session.email}</div>
            <span className={cn('mt-0.5 inline-block rounded px-1.5 py-px text-[10px] font-semibold', roleMeta.className)}>
              {roleMeta.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className={cn('flex-1 overflow-y-auto py-1', collapsed ? 'px-2' : 'px-3')}
        aria-label="Main navigation"
      >
        {!collapsed && <SectionLabel label="Workspace" />}
        <div className={cn('space-y-0.5', collapsed && 'pt-2')}>
          <NavItem href="/"              icon={LayoutDashboard} label="Dashboard"     active={pathname === '/'}                       collapsed={collapsed} />
          <NavItem href="/people"        icon={Users}           label="People"        active={pathname.startsWith('/people')}         collapsed={collapsed} />
          <NavItem href="/projects"      icon={Briefcase}       label="Projects"      active={pathname.startsWith('/projects')}       collapsed={collapsed} />
          <NavItem href="/organizations" icon={Building2}       label="Organizations" active={pathname.startsWith('/organizations')} collapsed={collapsed} />
          <NavItem href="/invoices"      icon={FileText}        label="Invoices"      active={pathname.startsWith('/invoices')}       collapsed={collapsed} />
          <NavItem href="/calendar"      icon={Calendar}        label="Calendar"      active={pathname.startsWith('/calendar')}       collapsed={collapsed} />
        </div>

        {isAdmin && (
          <>
            {!collapsed && <SectionLabel label="Admin" />}
            <div className={cn('space-y-0.5', collapsed && 'pt-2')}>
              <NavItem href="/admin" icon={Shield} label="User Management" active={pathname.startsWith('/admin')} collapsed={collapsed} />
            </div>
          </>
        )}
      </nav>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className={cn('shrink-0 pb-4', collapsed ? 'px-2' : 'px-3')}>
        <div className="border-t mb-2" />
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center h-9 rounded-lg text-[13.5px] font-medium text-muted-foreground',
            'hover:bg-accent hover:text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
          )}
          aria-label="Sign out"
        >
          <LogOut aria-hidden className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
