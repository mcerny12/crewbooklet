'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types/models';
import { Badge } from '@/components/ui/badge';
import { ProjectStatus, ProjectStatusColors } from '@/lib/types/models';
import { format } from 'date-fns';
import { ProjectDetailDrawer } from './project-detail-drawer';

interface ProjectListItemProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectListItem({ project, onClick }: ProjectListItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const statusColor = ProjectStatusColors[project.status as ProjectStatus];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsDetailOpen(true);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b last:border-b-0"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-base">{project.name}</h3>
            <Badge variant="outline" className="text-xs">
              {project.project_number}
            </Badge>
            <Badge
              variant="secondary"
              className={`bg-${statusColor}-100 text-${statusColor}-800 dark:bg-${statusColor}-900 dark:text-${statusColor}-200`}
            >
              {project.status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            {project.start_date && (
              <span>Start: {formatDate(project.start_date)}</span>
            )}
            {project.end_date && (
              <span>End: {formatDate(project.end_date)}</span>
            )}
            {project.shooting_location && (
              <span>📍 {project.shooting_location}</span>
            )}
          </div>

          {project.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <ProjectDetailDrawer
        project={project}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  );
}
