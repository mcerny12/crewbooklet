'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Search, Users, Briefcase, Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function avatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function SearchPage() {
  const router = useRouter();
  const t = useTranslations('search');
  const tNav = useTranslations('navigation');
  const [query, setQuery] = useState('');

  const people = usePeopleStore(s => s.people);
  const projects = useProjectsStore(s => s.projects);
  const organizations = useOrganizationsStore(s => s.organizations);

  const fetchPeople = usePeopleStore(s => s.fetchPeople);
  const fetchProjects = useProjectsStore(s => s.fetchProjects);
  const fetchOrganizations = useOrganizationsStore(s => s.fetchOrganizations);

  useEffect(() => {
    if (people.length === 0) fetchPeople();
    if (projects.length === 0) fetchProjects();
    if (organizations.length === 0) fetchOrganizations();
  }, [fetchPeople, fetchProjects, fetchOrganizations, people.length, projects.length, organizations.length]);

  const q = query.toLowerCase().trim();

  const results = useMemo(() => {
    if (!q) return null;
    return {
      people: people.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.jobs?.some(j => j.toLowerCase().includes(q))
      ).slice(0, 8),
      projects: projects.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.project_number.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      ).slice(0, 6),
      organizations: organizations.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.contact_email?.toLowerCase().includes(q) ||
        o.jobs?.some(j => j.toLowerCase().includes(q))
      ).slice(0, 6),
    };
  }, [q, people, projects, organizations]);

  const totalCount = results
    ? results.people.length + results.projects.length + results.organizations.length
    : 0;

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <MobilePageHeader title={t('title')} />

        {/* Search input */}
        <div className="shrink-0 border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
            <Input
              autoFocus
              placeholder={t('placeholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 h-11 text-base rounded-xl"
              aria-label={t('title')}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          {!q ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t('startTyping')}</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-8 text-center">
              <p className="text-sm font-medium">{t('noResults')}</p>
              <p className="text-xs text-muted-foreground">&ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* People */}
              {results!.people.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {tNav('people')} · {results!.people.length}
                    </span>
                  </div>
                  {results!.people.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => router.push(`/people?id=${person.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors border-b last:border-b-0"
                    >
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        avatarColor(person.name)
                      )}>
                        {initials(person.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[person.jobs?.[0], person.email].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                    </button>
                  ))}
                </section>
              )}

              {/* Projects */}
              {results!.projects.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {tNav('projects')} · {results!.projects.length}
                    </span>
                  </div>
                  {results!.projects.map(project => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => router.push(`/projects?id=${project.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors border-b last:border-b-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Briefcase className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.project_number}</p>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                    </button>
                  ))}
                </section>
              )}

              {/* Organizations */}
              {results!.organizations.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {tNav('organizations')} · {results!.organizations.length}
                    </span>
                  </div>
                  {results!.organizations.map(org => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => router.push(`/organizations?id=${org.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors border-b last:border-b-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Building2 className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {org.jobs?.slice(0, 2).join(', ') || org.contact_email || ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
