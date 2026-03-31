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
      <div className="relative flex h-full flex-col overflow-y-auto">
        <div className="p-4">
          {/* Stats Grid - more compact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <StatCard
              title="Total People"
              value={people.length}
              icon={Users}
              colorClass="text-blue-600"
              onClick={() => router.push('/people')}
            />
            <StatCard
              title="Active Projects"
              value={activeProjects.length}
              icon={Briefcase}
              colorClass="text-green-600"
              onClick={() => router.push('/projects')}
            />
            <StatCard
              title="Organizations"
              value={organizations.length}
              icon={Building2}
              colorClass="text-orange-600"
              onClick={() => router.push('/organizations')}
            />
          </div>

          {/* Content Grid - more compact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
