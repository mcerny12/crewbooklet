'use client';

import { useEffect, useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { CompactPersonListItem } from '@/components/people/compact-person-list-item';
import { AddPersonDialog } from '@/components/people/add-person-dialog';
import { PersonDetailDrawer } from '@/components/people/person-detail-drawer';
import { ProjectDetailDrawer } from '@/components/projects/project-detail-drawer';
import { OrganizationDetailDrawer } from '@/components/organizations/organization-detail-drawer';
import type { Person, Project, Organization } from '@/lib/types/models';

type DrillTarget = { type: 'project'; item: Project } | { type: 'org'; item: Organization };

/** Sticky column-header bar shared with list rows */
function ListHeader() {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
      style={{ gridTemplateColumns: '32px 2fr 1.5fr 1fr 1fr 1fr' }}
    >
      <div />
      {['Name & Position', 'Email', 'Phone', 'City', 'Country'].map(col => (
        <div key={col} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{col}</div>
      ))}
    </div>
  );
}

export default function PeoplePage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { canCreate } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const people = usePeopleStore(state => state.people);
  const isLoading = usePeopleStore(state => state.isLoading);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const searchPeople = usePeopleStore(state => state.searchPeople);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);

  useEffect(() => { fetchPeople(); fetchProjects(); fetchOrganizations(); }, [fetchPeople, fetchProjects, fetchOrganizations]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchPeople(query);
  };

  const handleSelect = (person: Person) => {
    setDrillTarget(null);
    setSelectedPersonId(prev => prev === person.id ? null : person.id);
  };

  // `people` already reflects the search filter (people-store mutates state via searchPeople)
  const filteredPeople = people;
  const selectedIndex = useMemo(
    () => (selectedPersonId ? filteredPeople.findIndex(p => p.id === selectedPersonId) : -1),
    [filteredPeople, selectedPersonId],
  );
  const selectedPerson = selectedIndex >= 0 ? filteredPeople[selectedIndex] : null;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < filteredPeople.length - 1;
  const goPrev = () => { if (hasPrev) setSelectedPersonId(filteredPeople[selectedIndex - 1].id); };
  const goNext = () => { if (hasNext) setSelectedPersonId(filteredPeople[selectedIndex + 1].id); };

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <PageHeader
          title="People"
          subtitle={people.length > 0 ? `${people.length} crew members` : undefined}
          search={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search people…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9"
                aria-label="Search people"
              />
            </div>
          }
          actions={
            canCreate ? (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                Add Person
              </Button>
            ) : undefined
          }
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : people.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground">No people found</p>
              {canCreate && (
                <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                  Add your first person
                </Button>
              )}
            </div>
          ) : (
            <>
              <ListHeader />
              {people.map((person) => (
                <CompactPersonListItem
                  key={person.id}
                  person={person}
                  onSelect={handleSelect}
                  isSelected={selectedPersonId === person.id}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {selectedPerson && (
        <PersonDetailDrawer
          person={selectedPerson}
          open={!!selectedPerson}
          onOpenChange={(v) => { if (!v) setSelectedPersonId(null); }}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onOpenProject={(p) => setDrillTarget({ type: 'project', item: p })}
          onOpenOrg={(o) => setDrillTarget({ type: 'org', item: o })}
        />
      )}

      {drillTarget?.type === 'project' && (
        <ProjectDetailDrawer
          project={drillTarget.item}
          open={true}
          onOpenChange={(v) => { if (!v) setDrillTarget(null); }}
        />
      )}

      {drillTarget?.type === 'org' && (
        <OrganizationDetailDrawer
          organization={drillTarget.item}
          open={true}
          onOpenChange={(v) => { if (!v) setDrillTarget(null); }}
        />
      )}

      <AddPersonDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
