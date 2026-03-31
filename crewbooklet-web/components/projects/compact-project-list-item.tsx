'use client';

import type { Project } from '@/lib/types/models';
import { Badge } from '@/components/ui/badge';
import { ProjectStatus } from '@/lib/types/models';
import { format } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';

interface CompactProjectListItemProps {
  project: Project;
  onSelect: (project: Project) => void;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  INQUIRY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  BUDGET: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PRODUCTION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  COMPLETED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  HOLD: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function CompactProjectListItem({ project, onSelect }: CompactProjectListItemProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try { return format(new Date(dateString), 'MMM d, yyyy'); } catch { return null; }
  };

  return (
    <div
      className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors items-center text-sm border-b"
      onClick={() => onSelect(project)}
    >
      {/* Name & Number */}
      <div className="min-w-0">
        <div className="font-medium truncate">{project.name}</div>
        <div className="text-xs text-gray-500 truncate">{project.project_number}</div>
      </div>

      {/* Status */}
      <div className="min-w-0">
        <Badge className={`text-xs px-2 py-0 ${STATUS_BADGE_COLORS[project.status] ?? 'bg-gray-100 text-gray-800'}`}>
          {project.status}
        </Badge>
      </div>

      {/* Dates */}
      <div className="min-w-0">
        {project.start_date ? (
          <div className="flex items-center gap-1 truncate">
            <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate text-xs">{formatDate(project.start_date)}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>

      {/* Location */}
      <div className="min-w-0">
        {project.shooting_location ? (
          <div className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate text-xs">{project.shooting_location}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>
    </div>
  );
}
