'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { CompactPersonListItem } from '@/components/people/compact-person-list-item';
import { AddPersonDialog } from '@/components/people/add-person-dialog';
import { PersonDetailPane } from '@/components/people/person-detail-drawer';
import { ProjectDetailPanel } from '@/components/projects/project-detail-panel';
import { OrgDetailPane } from '@/components/organizations/organization-detail-drawer';
import type { Person, Project, Organization } from '@/lib/types/models';

type DrillTarget = { type: 'project'; item: Project } | { type: 'org'; item: Organization };

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

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </Button>
          )}
        </div>

        {selectedPerson && drillTarget ? (
          <div className="flex-1 overflow-hidden">
            {drillTarget.type === 'project' ? (
              <ProjectDetailPanel
                project={drillTarget.item}
                onClose={() => setDrillTarget(null)}
              />
            ) : (
              <OrgDetailPane
                organization={drillTarget.item}
                onClose={() => setDrillTarget(null)}
              />
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
              <div className="flex h-full items-center justify-center">
                <div className="text-lg text-gray-500">Loading...</div>
              </div>
            ) : people.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-lg text-gray-500">No people found</p>
                {canCreate && (
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first person
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b sticky top-0 z-10">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Name & Position</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Email</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Phone</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">City</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Country</div>
                </div>
                {people.map((person) => (
                  <CompactPersonListItem
                    key={person.id}
                    person={person}
                    onSelect={handleSelect}
                    isSelected={selectedPerson?.id === person.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddPersonDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </MainLayout>
  );
}
