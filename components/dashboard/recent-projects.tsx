'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/lib/types/models';
import { ProjectStatus, ProjectStatusColors } from '@/lib/types/models';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';

interface RecentProjectsProps {
  projects: Project[];
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  const router = useRouter();

  const recentProjects = projects
    .filter(p => p.status === ProjectStatus.Production || p.status === ProjectStatus.Budget)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3">
        <CardTitle className="text-sm font-semibold">Current Projects</CardTitle>
        <Link href="/projects">
          <Button variant="outline" size="sm" className="h-7 text-xs">
            View All
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {recentProjects.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-2">No active projects</p>
            <Link href="/projects">
              <Button variant="outline" size="sm">Create Project</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects?id=${project.id}`)}
                className="flex items-center justify-between p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{project.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {project.project_number}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <Badge
                      variant="outline"
                      className={`text-xs px-1 py-0 bg-${ProjectStatusColors[project.status as ProjectStatus]}-100`}
                    >
                      {project.status}
                    </Badge>
                    {project.start_date && (
                      <span className="text-xs">
                        {format(new Date(project.start_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
