'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
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
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
      style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}
    >
      {['Name & Number', 'Status', 'Start Date', 'Location'].map(col => (
        <div key={col} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{col}</div>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
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
        <PageHeader
          title="Projects"
          subtitle={projects.length > 0 ? `${projects.length} projects` : undefined}
          search={
            !selectedProject ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="Search projects…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  aria-label="Search projects"
                />
              </div>
            ) : undefined
          }
          actions={
            canCreate ? (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                Add Project
              </Button>
            ) : undefined
          }
        />

        {selectedProject ? (
          <div className="flex-1 overflow-hidden">
            <ProjectDetailPanel project={selectedProject} onClose={() => setSelectedProject(null)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No projects match your search' : 'No projects yet'}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    Add your first project
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
