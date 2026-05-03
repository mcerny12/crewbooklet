'use client';

import type { Project } from '@/lib/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, FileText, Building2 } from 'lucide-react';
import { ProjectStatus, ProjectStatusColors } from '@/lib/types/models';
import { format } from 'date-fns';

interface ProjectDetailDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDetailDialog({ project, open, onOpenChange }: ProjectDetailDialogProps) {
  const statusColor = ProjectStatusColors[project.status as ProjectStatus];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl">{project.name}</DialogTitle>
            <Badge variant="outline" className="text-sm">
              {project.project_number}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
              Status
            </h3>
            <Badge
              variant="secondary"
              className={`bg-${statusColor}-100 text-${statusColor}-800 dark:bg-${statusColor}-900 dark:text-${statusColor}-200`}
            >
              {project.status}
            </Badge>
          </div>

          {/* Dates */}
          {(project.start_date || project.end_date) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </h3>
                <div className="space-y-2 text-sm">
                  {project.start_date && (
                    <div className="flex gap-2">
                      <span className="font-medium">Start Date:</span>
                      <span>{formatDate(project.start_date)}</span>
                    </div>
                  )}
                  {project.end_date && (
                    <div className="flex gap-2">
                      <span className="font-medium">End Date:</span>
                      <span>{formatDate(project.end_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Location Information */}
          {(project.inquiry_country || project.shooting_location) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <div className="space-y-2 text-sm">
                  {project.inquiry_country && (
                    <div className="flex gap-2">
                      <span className="font-medium">Inquiry Country:</span>
                      <span>{project.inquiry_country}</span>
                    </div>
                  )}
                  {project.shooting_location && (
                    <div className="flex gap-2">
                      <span className="font-medium">Shooting Location:</span>
                      <span>{project.shooting_location}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Client Organization */}
          {project.client_organization_id && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Client
                </h3>
                <p className="text-sm">Organization ID: {project.client_organization_id}</p>
              </div>
            </>
          )}

          {/* Description */}
          {project.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>
                <p className="text-sm whitespace-pre-wrap">{project.description}</p>
              </div>
            </>
          )}

          {/* Notes */}
          {project.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="text-xs text-gray-500">
            <div>Created: {formatDate(project.creation_date)}</div>
            <div>Last Updated: {formatDate(project.updated_at)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
