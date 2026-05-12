'use client';

import type { Project } from '@/lib/types/models';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactProjectListItemProps {
  project: Project;
  onSelect: (project: Project) => void;
  isSelected?: boolean;
}

export function CompactProjectListItem({ project, onSelect, isSelected }: CompactProjectListItemProps) {
  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return null; }
  };

  return (
    <div
      role="row"
      aria-selected={isSelected}
      onClick={() => onSelect(project)}
      className={cn(
        'grid items-center gap-3 px-5 py-3 cursor-pointer border-b transition-colors',
        'grid-cols-[2fr_1fr_1fr_1.5fr]',
        isSelected
          ? 'list-row-selected'
          : 'hover:bg-muted/40',
      )}
    >
      {/* Name & number */}
      <div className="min-w-0">
        <div className={cn('font-medium truncate text-[13.5px]', isSelected && 'text-primary')}>{project.name}</div>
        <div className="text-xs text-muted-foreground truncate">{project.project_number}</div>
      </div>

      {/* Status */}
      <div className="min-w-0">
        <ProjectStatusBadge status={project.status} />
      </div>

      {/* Start date */}
      <div className="min-w-0">
        {formatDate(project.start_date) ? (
          <div className="flex items-center gap-1 truncate text-[12.5px] text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
            <span className="truncate">{formatDate(project.start_date)}</span>
          </div>
        ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
      </div>

      {/* Location */}
      <div className="min-w-0">
        {project.shooting_location ? (
          <div className="flex items-center gap-1 truncate text-[12.5px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
            <span className="truncate">{project.shooting_location}</span>
          </div>
        ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
      </div>
    </div>
  );
}
