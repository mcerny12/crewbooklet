'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import type { Project } from '@/lib/types/models';
import { ProjectStatus } from '@/lib/types/models';
import { format } from 'date-fns';

interface RecentProjectsProps {
  projects: Project[];
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  const router = useRouter();

  const recentProjects = projects
    .filter(p => p.status === ProjectStatus.Production || p.status === ProjectStatus.Budget)
    .slice(0, 6);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="text-[14px] font-semibold">Active Projects</h2>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="h-7 text-[13px] gap-1 text-muted-foreground hover:text-foreground">
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </Link>
      </div>

      {/* Table */}
      {recentProjects.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">No active projects</p>
          <Link href="/projects" className="mt-2 inline-block">
            <Button variant="outline" size="sm">Create project</Button>
          </Link>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Project</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground hidden sm:table-cell">Start</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground hidden md:table-cell">Number</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recentProjects.map((project) => (
              <tr
                key={project.id}
                onClick={() => router.push(`/projects?id=${project.id}`)}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3 font-medium truncate max-w-0 w-full">{project.name}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-3 py-3 text-muted-foreground text-[13px] whitespace-nowrap hidden sm:table-cell">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-3 py-3 text-muted-foreground text-[13px] hidden md:table-cell">
                  {project.project_number}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
