'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { StatCard } from '@/components/dashboard/stat-card';
import { BirthdayCalendar } from '@/components/dashboard/birthday-calendar';
import { RecentProjects } from '@/components/dashboard/recent-projects';
import { Users, Briefcase, Building2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const people = usePeopleStore(state => state.people);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);

  const projects = useProjectsStore(state => state.projects);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);

  useEffect(() => {
    fetchPeople();
    fetchProjects();
    fetchOrganizations();
  }, [fetchPeople, fetchProjects, fetchOrganizations]);

  const activeProjects = projects.filter(
    p => p.status === 'PRODUCTION' || p.status === 'BUDGET'
  );

  return (
    <MainLayout>
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Page header */}
        <div className="shrink-0 border-b bg-card px-6 py-5">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* KPI stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Crew members"
              value={people.length}
              icon={Users}
              colorClass="bg-blue-50 text-blue-600"
              onClick={() => router.push('/people')}
            />
            <StatCard
              title="Active projects"
              value={activeProjects.length}
              icon={Briefcase}
              colorClass="bg-emerald-50 text-emerald-600"
              onClick={() => router.push('/projects')}
            />
            <StatCard
              title="Organizations"
              value={organizations.length}
              icon={Building2}
              colorClass="bg-orange-50 text-orange-600"
              onClick={() => router.push('/organizations')}
            />
          </div>

          {/* Main content row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <BirthdayCalendar people={people} />
            </div>
            <div className="lg:col-span-2">
              <RecentProjects projects={projects} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
