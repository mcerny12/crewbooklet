'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { StatCard } from '@/components/dashboard/stat-card';
import { UpcomingEvents } from '@/components/dashboard/upcoming-events';
import { RecentProjects } from '@/components/dashboard/recent-projects';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { MobileDashboardSection } from '@/components/mobile/mobile-dashboard-section';
import { MobileEmptyState } from '@/components/mobile/mobile-empty-state';
import { Users, Briefcase, Building2, MapPin, CalendarDays } from 'lucide-react';
import { ProjectStatus, type Project } from '@/lib/types/models';

function MobileProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const format = useFormatter();
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border bg-card p-4 shadow-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold">{project.name}</span>
        <ProjectStatusBadge status={project.status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {project.project_number && (
          <span>{project.project_number}</span>
        )}
        {project.start_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {format.dateTime(new Date(project.start_date), { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        {(project.shooting_location || project.inquiry_country) && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden />
            {project.shooting_location ?? project.inquiry_country}
          </span>
        )}
      </div>
    </button>
  );
}

function MobileUpcomingSchedule({ projects }: { projects: Project[] }) {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const upcoming = projects
    .filter(p => p.start_date && new Date(p.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{t('noUpcomingShoots')}</p>
    );
  }

  return (
    <div className="divide-y rounded-2xl border bg-card shadow-sm overflow-hidden">
      {upcoming.map(project => (
        <div key={project.id} className="flex items-center gap-3 px-4 py-3">
          <div className="shrink-0 rounded-xl bg-primary/10 px-2 py-1 text-center min-w-[48px]">
            <p className="text-[10px] font-semibold uppercase text-primary">
              {format.dateTime(new Date(project.start_date!), { month: 'short' })}
            </p>
            <p className="text-lg font-bold leading-tight text-primary">
              {format.dateTime(new Date(project.start_date!), { day: 'numeric' })}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{project.name}</p>
            {project.shooting_location && (
              <p className="truncate text-xs text-muted-foreground">{project.shooting_location}</p>
            )}
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
      ))}
    </div>
  );
}

function MobileStatMini({ title, value, href, router }: {
  title: string; value: number; href: string; router: ReturnType<typeof useRouter>;
}) {
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex flex-col items-center gap-1 rounded-2xl border bg-card p-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{title}</span>
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const people = usePeopleStore(state => state.people);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);

  const projects = useProjectsStore(state => state.projects);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);

  useEffect(() => {
    fetchPeople();
    fetchProjects();
    fetchOrganizations();
  }, [fetchPeople, fetchProjects, fetchOrganizations]);

  const activeProjects = projects.filter(
    p => p.status === ProjectStatus.Production || p.status === ProjectStatus.Budget
  );

  return (
    <MainLayout key={locale}>
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Mobile header */}
        <MobilePageHeader title="CrewBooklet" />
        {/* Desktop header */}
        <div className="hidden lg:flex shrink-0 border-b bg-card h-12 items-center px-4">
          <h1 className="text-[15px] font-semibold tracking-tight">{t('title')}</h1>
        </div>

        {/* Mobile layout */}
        <div
          className="lg:hidden space-y-5 px-4 py-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <MobileDashboardSection title={t('ongoingProjects')}>
            {activeProjects.length === 0 ? (
              <MobileEmptyState title={t('noOngoingProjects')} description={t('noOngoingProjectsDescription')} />
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 5).map(project => (
                  <MobileProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => router.push(`/projects?id=${project.id}`)}
                  />
                ))}
              </div>
            )}
          </MobileDashboardSection>

          <MobileDashboardSection title={t('upcomingSchedule')}>
            <MobileUpcomingSchedule projects={projects} />
          </MobileDashboardSection>

          <MobileDashboardSection title={t('overview')}>
            <div className="grid grid-cols-3 gap-3">
              <MobileStatMini title={t('people')} value={people.length} href="/people" router={router} />
              <MobileStatMini title={t('projects')} value={projects.length} href="/projects" router={router} />
              <MobileStatMini title={t('orgs')} value={organizations.length} href="/organizations" router={router} />
            </div>
          </MobileDashboardSection>
        </div>

        {/* Desktop layout */}
        <div className="hidden lg:block flex-1 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title={t('crewMembers')}
              value={people.length}
              icon={Users}
              colorClass="bg-blue-50 text-blue-600"
              onClick={() => router.push('/people')}
            />
            <StatCard
              title={t('activeProjects')}
              value={activeProjects.length}
              icon={Briefcase}
              colorClass="bg-emerald-50 text-emerald-600"
              onClick={() => router.push('/projects')}
            />
            <StatCard
              title={t('organizations')}
              value={organizations.length}
              icon={Building2}
              colorClass="bg-orange-50 text-orange-600"
              onClick={() => router.push('/organizations')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <UpcomingEvents people={people} projects={projects} />
            </div>
            <div className="lg:col-span-2">
              <RecentProjects projects={projects} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
