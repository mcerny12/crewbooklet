'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { CompactOrganizationListItem } from '@/components/organizations/compact-organization-list-item';
import { AddOrganizationDialog } from '@/components/organizations/add-organization-dialog';
import { OrgDetailPane } from '@/components/organizations/organization-detail-drawer';
import { ProjectDetailPanel } from '@/components/projects/project-detail-panel';
import { PersonDetailPane } from '@/components/people/person-detail-drawer';
import type { Organization, Project, Person } from '@/lib/types/models';

type DrillTarget = { type: 'project'; item: Project } | { type: 'person'; item: Person };

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const { canCreate } = usePermissions();
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const organizations = useOrganizationsStore(state => state.organizations);
  const isLoading = useOrganizationsStore(state => state.isLoading);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  useEffect(() => { fetchOrganizations(); fetchPeople(); fetchProjects(); }, [fetchOrganizations, fetchPeople, fetchProjects]);

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOrgId = selectedOrg?.id ?? null;

  const handleSelect = (org: Organization) => {
    setDrillTarget(null);
    setSelectedOrg(prev => prev?.id === org.id ? null : org);
  };

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Organization
            </Button>
          )}
        </div>

        {selectedOrg && drillTarget ? (
          <div className="flex-1 overflow-hidden">
            {drillTarget.type === 'project' ? (
              <ProjectDetailPanel
                project={drillTarget.item}
                onClose={() => setDrillTarget(null)}
              />
            ) : (
              <PersonDetailPane
                person={drillTarget.item}
                onClose={() => setDrillTarget(null)}
              />
            )}
          </div>
        ) : selectedOrg ? (
          <div className="flex-1 overflow-hidden">
            <OrgDetailPane
              organization={selectedOrg}
              onClose={() => setSelectedOrg(null)}
              onOpenProject={(p) => setDrillTarget({ type: 'project', item: p })}
              onOpenPerson={(p) => setDrillTarget({ type: 'person', item: p })}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-lg text-gray-500">Loading...</div>
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-lg text-gray-500">
                  {searchQuery ? 'No organizations found' : 'No organizations yet'}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first organization
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[24px_2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b sticky top-0 z-10">
                  <div />
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Name & Type</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Email</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Phone</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Website</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Location</div>
                </div>
                {filteredOrganizations.map((organization) => (
                  <CompactOrganizationListItem
                    key={organization.id}
                    organization={organization}
                    onSelect={handleSelect}
                    isSelected={selectedOrgId === organization.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddOrganizationDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
