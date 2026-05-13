'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  LogOut, Film, PanelLeftClose, PanelLeftOpen, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useSidebar } from './sidebar-context';
import {
  primaryNavItems,
  adminNavItems,
  isNavItemActive,
  type NavItem as NavItemType,
} from './nav-config';
import { UserRole } from '@/lib/types/models';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SIDEBAR_ID = 'primary-sidebar';

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  [UserRole.Admin]:  { label: 'Admin',  className: 'bg-blue-100 text-blue-700' },
  [UserRole.User]:   { label: 'User',   className: 'bg-slate-100 text-slate-600' },
  [UserRole.Viewer]: { label: 'Viewer', className: 'bg-slate-100 text-slate-500' },
};

function NavItem({
  item, active, collapsed, onNavigate,
}: {
  item: NavItemType;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex h-10 items-center rounded-xl text-sm font-medium transition-colors',
        collapsed ? 'justify-center' : 'gap-3 px-3',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
        />
      )}
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" align="center">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNavGroup({
  label, collapsed, children,
}: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {!collapsed ? (
        <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
          {label}
        </div>
      ) : (
        <div aria-hidden="true" className="mx-3 mb-1 mt-1 h-px bg-border" />
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function UserSummary({
  collapsed, email, role,
}: { collapsed: boolean; email: string | null; role: UserRole }) {
  const roleMeta = ROLE_BADGE[role] ?? ROLE_BADGE[UserRole.Viewer];
  const initials = email ? email.slice(0, 2).toUpperCase() : '??';

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-label={email ? `${email} (${roleMeta.label})` : roleMeta.label}
            className="mx-auto flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          <div className="text-xs">{email}</div>
          <div className="text-[10px] opacity-70">{roleMeta.label}</div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3 px-1">
      <div
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-muted-foreground leading-tight">{email}</div>
        <span className={cn(
          'mt-0.5 inline-block rounded px-1.5 py-px text-[10px] font-semibold',
          roleMeta.className,
        )}>
          {roleMeta.label}
        </span>
      </div>
    </div>
  );
}

function SignOutButton({ collapsed, onSignOut }: { collapsed: boolean; onSignOut: () => void }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-10 w-full items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">Sign out</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      aria-label="Sign out"
      className="flex h-10 w-full items-center gap-3 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>Sign out</span>
    </button>
  );
}

export function MobileSidebarTrigger() {
  const { isDesktop, setMobileOpen } = useSidebar();
  if (isDesktop) return null;
  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Open sidebar"
      title="Open sidebar"
      className="fixed top-2 left-2 z-30 flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:hidden"
    >
      <Menu className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function SidebarBody({
  isDesktop, collapsed, pathname, isAdmin, session, onNavigate, onToggleDesktop, onCloseMobile, onSignOut,
}: {
  isDesktop: boolean;
  collapsed: boolean;
  pathname: string;
  isAdmin: boolean;
  session: { email: string | null; role: UserRole };
  onNavigate: () => void;
  onToggleDesktop: () => void;
  onCloseMobile: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside
      id={SIDEBAR_ID}
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'flex h-full flex-col border-r bg-card overflow-hidden',
        isDesktop
          ? cn(
              'transition-[width] duration-200 ease-out motion-reduce:transition-none',
              collapsed ? 'w-18' : 'w-66',
            )
          : 'w-70',
      )}
    >
      {/* Brand area */}
      <div
        className={cn(
          'shrink-0 border-b',
          collapsed
            ? 'flex flex-col items-center gap-2 py-3 px-2'
            : 'flex h-12 items-center gap-3 px-3',
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                onClick={onNavigate}
                aria-label="Go to dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Film className="h-5 w-5" aria-hidden="true" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">Dashboard</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/"
            onClick={onNavigate}
            aria-label="Go to dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Film className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight">CrewBooklet</div>
          </div>
        )}

        {isDesktop ? (
          <button
            type="button"
            onClick={onToggleDesktop}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls={SIDEBAR_ID}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            title="Close sidebar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        aria-label="Primary navigation"
        className={cn('flex-1 space-y-4 overflow-y-auto overflow-x-hidden py-4', collapsed ? 'px-2' : 'px-3')}
      >
        <SidebarNavGroup label="Workspace" collapsed={collapsed}>
          {primaryNavItems.map(item => (
            <NavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={isNavItemActive(pathname, item.href, item.exact)}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarNavGroup>

        {isAdmin && (
          <SidebarNavGroup label="Admin" collapsed={collapsed}>
            {adminNavItems.map(item => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isNavItemActive(pathname, item.href, item.exact)}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarNavGroup>
        )}
      </nav>

      {/* Footer */}
      <div className={cn('border-t shrink-0 space-y-2', collapsed ? 'p-2' : 'p-3')}>
        <UserSummary collapsed={collapsed} email={session.email} role={session.role} />
        <SignOutButton collapsed={collapsed} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isDesktop, collapsed, mobileOpen, setMobileOpen, toggleDesktop } = useSidebar();
  const session = useAuthStore(state => state.session);
  const signOut = useAuthStore(state => state.signOut);
  const { isAdmin } = usePermissions();

  const onNavigate = React.useCallback(() => {
    if (!isDesktop) setMobileOpen(false);
  }, [isDesktop, setMobileOpen]);

  const handleSignOut = React.useCallback(async () => {
    await signOut();
    window.location.href = '/login';
  }, [signOut]);

  const body = (
    <SidebarBody
      isDesktop={isDesktop}
      collapsed={collapsed}
      pathname={pathname}
      isAdmin={isAdmin}
      session={{ email: session.email, role: session.role }}
      onNavigate={onNavigate}
      onToggleDesktop={toggleDesktop}
      onCloseMobile={() => setMobileOpen(false)}
      onSignOut={handleSignOut}
    />
  );

  return (
    <TooltipProvider delayDuration={250}>
      {isDesktop ? (
        body
      ) : (
        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden"
            />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-50 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
            >
              <DialogPrimitive.Title className="sr-only">Primary navigation</DialogPrimitive.Title>
              {body}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </TooltipProvider>
  );
}
