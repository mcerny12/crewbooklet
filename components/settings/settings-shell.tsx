'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { Settings as SettingsIcon, Shield, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneralSection } from './general-section';
import { AdminUsersSection } from './admin-users-section';
import { AdminJobTypesSection } from './admin-job-types-section';

type SectionId = 'general' | 'admin-users' | 'admin-job-types';

interface SectionDef {
  id: SectionId;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly: boolean;
  render: () => React.ReactNode;
}

const SECTIONS: SectionDef[] = [
  { id: 'general',         labelKey: 'sections.general',      icon: SettingsIcon, adminOnly: false, render: () => <GeneralSection /> },
  { id: 'admin-users',     labelKey: 'sections.adminUsers',   icon: Users,        adminOnly: true,  render: () => <AdminUsersSection /> },
  { id: 'admin-job-types', labelKey: 'sections.adminJobTypes', icon: Briefcase,   adminOnly: true,  render: () => <AdminJobTypesSection /> },
];

export function SettingsShell() {
  const t = useTranslations('settings');
  const router = useRouter();
  const params = useSearchParams();
  const { isAdmin } = usePermissions();

  const visibleSections = useMemo(
    () => SECTIONS.filter(s => !s.adminOnly || isAdmin),
    [isAdmin]
  );

  const requested = (params.get('section') as SectionId | null) ?? null;
  const requestedSection = visibleSections.find(s => s.id === requested) ?? null;
  // If a non-admin deep-links to an admin section, silently fall back to
  // general — admin sections must not even render their fetch effects.
  const activeSection = requestedSection ?? visibleSections[0];

  const setSection = (id: SectionId) => {
    router.replace(`/settings?section=${id}`, { scroll: false });
  };

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <MobilePageHeader title={t('title')} />
        <div className="hidden lg:flex shrink-0 border-b bg-card h-12 items-center gap-2 px-4">
          <SettingsIcon className="h-4 w-4 text-primary" aria-hidden />
          <h1 className="text-[15px] font-semibold tracking-tight">{t('title')}</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row md:gap-8">
            {/* Section nav: vertical on desktop, stacked above on mobile */}
            <nav
              aria-label={t('navAriaLabel')}
              className="shrink-0 md:w-56"
            >
              <ul className="flex flex-row flex-wrap gap-1 md:flex-col">
                {visibleSections.map((section) => {
                  const Icon = section.icon;
                  const active = section.id === activeSection.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => setSection(section.id)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {t(section.labelKey)}
                        {section.adminOnly && (
                          <Shield className="ml-auto h-3 w-3 text-muted-foreground/60" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="min-w-0 flex-1">
              {activeSection.render()}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
