'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { CompactProjectListItem } from '@/components/projects/compact-project-list-item';
import { AddProjectDialog } from '@/components/projects/add-project-dialog';
import { ProjectDetailPanel } from '@/components/projects/project-detail-panel';
import type { Project } from '@/lib/types/models';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { canCreate } = usePermissions();

  const searchParams = useSearchParams();
  const projects = useProjectsStore(state => state.projects);
  const isLoading = useProjectsStore(state => state.isLoading);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && projects.length > 0) {
      const match = projects.find(p => p.id === id);
      if (match) setSelectedProject(match);
    }
  }, [searchParams, projects]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="relative flex h-full flex-col">
        <div className="border-b px-4 py-3 shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              disabled={!!selectedProject}
            />
          </div>
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          )}
        </div>

        {selectedProject ? (
          // Detail panel — takes over the full list area, overflow controlled inside panel
          <div className="flex-1 overflow-hidden">
            <ProjectDetailPanel
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />
          </div>
        ) : (
          // List view
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-lg text-gray-500">Loading...</div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-lg text-gray-500">
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first project
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {/* Header Row */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b sticky top-0 z-10">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Name & Number</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Status</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Start Date</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Location</div>
                </div>
                {/* List Items */}
                {filteredProjects.map((project) => (
                  <CompactProjectListItem
                    key={project.id}
                    project={project}
                    onSelect={setSelectedProject}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddProjectDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </MainLayout>
  );
}
