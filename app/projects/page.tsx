'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
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
import { ProjectDetailDrawer } from '@/components/projects/project-detail-drawer';

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { canCreate } = usePermissions();

  const projects = useProjectsStore(state => state.projects);
  const isLoading = useProjectsStore(state => state.isLoading);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleSelectById = (id: string) => {
    const match = projects.find(p => p.id === id);
    if (match) setSelectedProjectId(match.id);
  };

  const filteredProjects = useMemo(() => projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [projects, searchQuery]);

  const selectedIndex = useMemo(
    () => (selectedProjectId ? filteredProjects.findIndex(p => p.id === selectedProjectId) : -1),
    [filteredProjects, selectedProjectId],
  );
  const selectedProject = selectedIndex >= 0 ? filteredProjects[selectedIndex] : null;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < filteredProjects.length - 1;
  const goPrev = () => { if (hasPrev) setSelectedProjectId(filteredProjects[selectedIndex - 1].id); };
  const goNext = () => { if (hasNext) setSelectedProjectId(filteredProjects[selectedIndex + 1].id); };

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
                  onSelect={(p) => setSelectedProjectId(p.id)}
                  isSelected={selectedProjectId === project.id}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {selectedProject && (
        <ProjectDetailDrawer
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(v) => { if (!v) setSelectedProjectId(null); }}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}

      <AddProjectDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
