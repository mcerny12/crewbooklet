'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, Briefcase, Building2, Calendar, LogOut,
  LayoutDashboard, FileText, Shield, Film,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useSidebar } from './sidebar-context';
import { UserRole } from '@/lib/types/models';
import { cn } from '@/lib/utils';

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  [UserRole.Admin]:  { label: 'Admin',  className: 'bg-blue-100 text-blue-700' },
  [UserRole.User]:   { label: 'User',   className: 'bg-slate-100 text-slate-600' },
  [UserRole.Viewer]: { label: 'Viewer', className: 'bg-slate-100 text-slate-500' },
};

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onNavigate: () => void;
}

function NavItem({ href, icon: Icon, label, active, onNavigate }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13.5px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active
          ? 'bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--color-primary)]'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon
        aria-hidden
        className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground/70')}
      />
      {label}
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
  const { open, setOpen } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const closeOnNav = () => setOpen(false);

  const roleMeta = ROLE_BADGE[session.role] ?? ROLE_BADGE[UserRole.Viewer];
  const initials = session.email ? session.email.slice(0, 2).toUpperCase() : '??';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-63 flex-col border-r bg-card transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-5 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Film className="h-4 w-4" aria-hidden />
          </div>
          <span className="text-[16px] font-bold tracking-tight">CrewBooklet</span>
        </div>

        <div className="mx-4 border-b" />

        {/* ── User profile ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0">
          <div
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-muted-foreground leading-tight">{session.email}</div>
            <span className={cn('mt-0.5 inline-block rounded px-1.5 py-px text-[10px] font-semibold', roleMeta.className)}>
              {roleMeta.label}
            </span>
          </div>
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-1" aria-label="Main navigation">
          <SectionLabel label="Workspace" />
          <div className="space-y-0.5">
            <NavItem href="/"              icon={LayoutDashboard} label="Dashboard"     active={pathname === '/'}                       onNavigate={closeOnNav} />
            <NavItem href="/people"        icon={Users}           label="People"        active={pathname.startsWith('/people')}        onNavigate={closeOnNav} />
            <NavItem href="/projects"      icon={Briefcase}       label="Projects"      active={pathname.startsWith('/projects')}      onNavigate={closeOnNav} />
            <NavItem href="/organizations" icon={Building2}       label="Organizations" active={pathname.startsWith('/organizations')} onNavigate={closeOnNav} />
            <NavItem href="/invoices"      icon={FileText}        label="Invoices"      active={pathname.startsWith('/invoices')}      onNavigate={closeOnNav} />
            <NavItem href="/calendar"      icon={Calendar}        label="Calendar"      active={pathname.startsWith('/calendar')}      onNavigate={closeOnNav} />
          </div>

          {isAdmin && (
            <>
              <SectionLabel label="Admin" />
              <div className="space-y-0.5">
                <NavItem href="/admin" icon={Shield} label="User Management" active={pathname.startsWith('/admin')} onNavigate={closeOnNav} />
              </div>
            </>
          )}
        </nav>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pb-4">
          <div className="border-t mb-2" />
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 h-9 px-3 rounded-lg text-[13.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Sign out"
          >
            <LogOut aria-hidden className="h-4.5 w-4.5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
