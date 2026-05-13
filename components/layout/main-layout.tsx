'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Sidebar } from './sidebar';
import { useSidebar } from './sidebar-context';
import { Menu } from 'lucide-react';

function MobileNavBar() {
  const { isDesktop, setMobileOpen } = useSidebar();
  if (isDesktop) return null;
  return (
    <div className="shrink-0 flex h-12 items-center border-b bg-card px-3 lg:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <MobileNavBar />
        <main className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
