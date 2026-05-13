'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { CompactOrganizationListItem } from '@/components/organizations/compact-organization-list-item';
import { AddOrganizationDialog } from '@/components/organizations/add-organization-dialog';
import { OrgDetailPane } from '@/components/organizations/organization-detail-drawer';
import { ProjectDetailPanel } from '@/components/projects/project-detail-panel';
import { PersonDetailPane } from '@/components/people/person-detail-drawer';
import type { Organization, Project, Person } from '@/lib/types/models';

type DrillTarget = { type: 'project'; item: Project } | { type: 'person'; item: Person };

function ListHeader() {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
      style={{ gridTemplateColumns: '28px 2fr 1.5fr 1fr 1fr 1fr' }}
    >
      <div />
      {['Name & Type', 'Email', 'Phone', 'Website', 'Location'].map(col => (
        <div key={col} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{col}</div>
      ))}
    </div>
  );
}

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
        <PageHeader
          title="Organizations"
          subtitle={organizations.length > 0 ? `${organizations.length} companies & vendors` : undefined}
          search={
            !selectedOrg ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="Search organizations…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  aria-label="Search organizations"
                />
              </div>
            ) : undefined
          }
          actions={
            canCreate ? (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                Add Organization
              </Button>
            ) : undefined
          }
        />

        {selectedOrg && drillTarget ? (
          <div className="flex-1 overflow-hidden">
            {drillTarget.type === 'project' ? (
              <ProjectDetailPanel project={drillTarget.item} onClose={() => setDrillTarget(null)} />
            ) : (
              <PersonDetailPane person={drillTarget.item} onClose={() => setDrillTarget(null)} />
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
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No organizations match your search' : 'No organizations yet'}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    Add your first organization
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ListHeader />
                {filteredOrganizations.map((organization) => (
                  <CompactOrganizationListItem
                    key={organization.id}
                    organization={organization}
                    onSelect={handleSelect}
                    isSelected={selectedOrgId === organization.id}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <AddOrganizationDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
