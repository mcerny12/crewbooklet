'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { CompactPersonListItem } from '@/components/people/compact-person-list-item';
import { AddPersonDialog } from '@/components/people/add-person-dialog';
import { PersonDetailPane } from '@/components/people/person-detail-drawer';
import { ProjectDetailPanel } from '@/components/projects/project-detail-panel';
import { OrgDetailPane } from '@/components/organizations/organization-detail-drawer';
import type { Person, Project, Organization } from '@/lib/types/models';

type DrillTarget = { type: 'project'; item: Project } | { type: 'org'; item: Organization };

/** Sticky column-header bar shared with list rows */
function ListHeader() {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 hidden md:grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
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
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const people = usePeopleStore(state => state.people);
  const isLoading = usePeopleStore(state => state.isLoading);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const searchPeople = usePeopleStore(state => state.searchPeople);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  useEffect(() => { fetchPeople(); fetchProjects(); }, [fetchPeople, fetchProjects]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchPeople(query);
  };

  const handleSelect = (person: Person) => {
    setDrillTarget(null);
    setSelectedPerson(prev => prev?.id === person.id ? null : person);
  };

  const selectedPersonId = selectedPerson?.id ?? null;

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        {/* Mobile header */}
        <MobilePageHeader
          title="People"
          subtitle={people.length > 0 ? `${people.length} crew members` : undefined}
          rightAction={
            canCreate && !selectedPerson ? (
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                aria-label="Add person"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Plus className="h-5 w-5" aria-hidden />
              </button>
            ) : undefined
          }
        />
        {/* Mobile search */}
        {!selectedPerson && (
          <div className="lg:hidden border-b px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search people…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9 text-base"
                aria-label="Search people"
              />
            </div>
          </div>
        )}
        {/* Desktop header */}
        <div className="hidden lg:block">
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
        </div>

        {selectedPerson && drillTarget ? (
          <div className="flex-1 overflow-hidden">
            {drillTarget.type === 'project' ? (
              <ProjectDetailPanel project={drillTarget.item} onClose={() => setDrillTarget(null)} />
            ) : (
              <OrgDetailPane organization={drillTarget.item} onClose={() => setDrillTarget(null)} />
            )}
          </div>
        ) : selectedPerson ? (
          <div className="flex-1 overflow-hidden">
            <PersonDetailPane
              person={selectedPerson}
              onClose={() => setSelectedPerson(null)}
              onOpenProject={(p) => setDrillTarget({ type: 'project', item: p })}
              onOpenOrg={(o) => setDrillTarget({ type: 'org', item: o })}
            />
          </div>
        ) : (
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
        )}
      </div>

      <AddPersonDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
