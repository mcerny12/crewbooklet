'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Sidebar } from './sidebar';
import { SidebarProvider, useSidebar } from './sidebar-context';

function SidebarOpenButton() {
  const { open, setOpen } = useSidebar();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="fixed top-2 left-2 z-30 flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="Open sidebar"
      title="Open sidebar"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useAuthStore(state => state.session);
  const isLoading = useAuthStore(state => state.isLoading);

  useEffect(() => {
    if (!isLoading && !session.isAuthenticated) {
      router.push('/login');
    }
  }, [session.isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-gray-950">
          {children}
        </main>
        <SidebarOpenButton />
      </div>
    </SidebarProvider>
  );
}
