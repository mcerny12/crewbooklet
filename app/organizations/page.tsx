'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { OrganizationDetailDrawer } from '@/components/organizations/organization-detail-drawer';
import { ProjectDetailDrawer } from '@/components/projects/project-detail-drawer';
import { PersonDetailDrawer } from '@/components/people/person-detail-drawer';
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
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { canCreate } = usePermissions();
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const organizations = useOrganizationsStore(state => state.organizations);
  const isLoading = useOrganizationsStore(state => state.isLoading);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  useEffect(() => { fetchOrganizations(); fetchPeople(); fetchProjects(); }, [fetchOrganizations, fetchPeople, fetchProjects]);

  const filteredOrganizations = useMemo(() => organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [organizations, searchQuery]);

  const selectedIndex = useMemo(
    () => (selectedOrgId ? filteredOrganizations.findIndex(o => o.id === selectedOrgId) : -1),
    [filteredOrganizations, selectedOrgId],
  );
  const selectedOrg = selectedIndex >= 0 ? filteredOrganizations[selectedIndex] : null;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < filteredOrganizations.length - 1;
  const goPrev = () => { if (hasPrev) setSelectedOrgId(filteredOrganizations[selectedIndex - 1].id); };
  const goNext = () => { if (hasNext) setSelectedOrgId(filteredOrganizations[selectedIndex + 1].id); };

  const handleSelect = (org: Organization) => {
    setDrillTarget(null);
    setSelectedOrgId(prev => prev === org.id ? null : org.id);
  };

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <PageHeader
          title="Organizations"
          subtitle={organizations.length > 0 ? `${organizations.length} companies & vendors` : undefined}
          search={
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
      </div>

      {selectedOrg && (
        <OrganizationDetailDrawer
          organization={selectedOrg}
          open={!!selectedOrg}
          onOpenChange={(v) => { if (!v) setSelectedOrgId(null); }}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onOpenProject={(p) => setDrillTarget({ type: 'project', item: p })}
          onOpenPerson={(p) => setDrillTarget({ type: 'person', item: p })}
        />
      )}

      {drillTarget?.type === 'project' && (
        <ProjectDetailDrawer
          project={drillTarget.item}
          open={true}
          onOpenChange={(v) => { if (!v) setDrillTarget(null); }}
        />
      )}

      {drillTarget?.type === 'person' && (
        <PersonDetailDrawer
          person={drillTarget.item}
          open={true}
          onOpenChange={(v) => { if (!v) setDrillTarget(null); }}
        />
      )}

      <AddOrganizationDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
