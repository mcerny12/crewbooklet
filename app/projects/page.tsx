'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { CompactProjectListItem } from '@/components/projects/compact-project-list-item';
import { AddProjectDialog } from '@/components/projects/add-project-dialog';
import { ProjectDetailPanel } from '@/components/projects/project-detail-panel';
import type { Project } from '@/lib/types/models';

function ProjectIdSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const searchParams = useSearchParams();
  const projects = useProjectsStore(state => state.projects);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && projects.length > 0) {
      const match = projects.find(p => p.id === id);
      if (match) onSelect(match.id);
    }
  }, [searchParams, projects, onSelect]);

  return null;
}

function ListHeader() {
  const t = useTranslations('projects.columns');
  const cols = ['nameAndNumber', 'status', 'startDate', 'location'] as const;
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 hidden md:grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
      style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}
    >
      {cols.map(col => (
        <div key={col} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t(col)}</div>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { canCreate } = usePermissions();

  const projects = useProjectsStore(state => state.projects);
  const isLoading = useProjectsStore(state => state.isLoading);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);
  const selectedProjectId = selectedProject?.id ?? null;

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleSelectById = (id: string) => {
    const match = projects.find(p => p.id === id);
    if (match) setSelectedProject(match);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <Suspense>
        <ProjectIdSelector onSelect={handleSelectById} />
      </Suspense>
      <div className="flex h-full flex-col">
        {/* Mobile header */}
        <MobilePageHeader
          title={t('title')}
          subtitle={projects.length > 0 ? t('count', { count: projects.length }) : undefined}
          rightAction={
            canCreate && !selectedProject ? (
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                aria-label={t('actions.addProject')}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Plus className="h-5 w-5" aria-hidden />
              </button>
            ) : undefined
          }
        />
        {/* Desktop header */}
        <div className="hidden lg:block">
          <PageHeader
            title={t('title')}
            subtitle={projects.length > 0 ? t('count', { count: projects.length }) : undefined}
            search={
              !selectedProject ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder={t('searchProjects')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                    aria-label={t('searchProjects')}
                  />
                </div>
              ) : undefined
            }
            actions={
              canCreate ? (
                <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('addProject')}
                </Button>
              ) : undefined
            }
          />
        </div>

        {selectedProject ? (
          <div className="flex-1 overflow-hidden">
            <ProjectDetailPanel project={selectedProject} onClose={() => setSelectedProject(null)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{tCommon('loading')}</div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? t('noProjectsMatch') : t('noProjectsYet')}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    {t('addFirstProject')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ListHeader />
                {filteredProjects.map(project => (
                  <CompactProjectListItem
                    key={project.id}
                    project={project}
                    onSelect={(p) => setSelectedProject(p)}
                    isSelected={selectedProjectId === project.id}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <AddProjectDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
