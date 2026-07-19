'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
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

function ListHeader() {
  const t = useTranslations('people.columns');
  const cols = ['nameAndPosition', 'email', 'phone', 'city', 'country'] as const;
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 hidden md:grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
      style={{ gridTemplateColumns: '32px 2fr 1.5fr 1fr 1fr 1fr' }}
    >
      <div />
      {cols.map(col => (
        <div key={col} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t(col)}</div>
      ))}
    </div>
  );
}

export default function PeoplePage() {
  const t = useTranslations('people');
  const tCommon = useTranslations('common');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { canCreate } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [personActiveTab, setPersonActiveTab] = useState<string>('profile');
  const savedTabRef = useRef<string>('profile');
  const urlParamsReadRef = useRef(false);

  const people = usePeopleStore(state => state.people);
  const isLoading = usePeopleStore(state => state.isLoading);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const searchPeople = usePeopleStore(state => state.searchPeople);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);

  useEffect(() => { fetchPeople(); fetchProjects(); }, [fetchPeople, fetchProjects]);

  // Restore selection from URL on initial load (after data loads)
  useEffect(() => {
    if (urlParamsReadRef.current || people.length === 0) return;
    urlParamsReadRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const tab = params.get('tab') ?? 'profile';
    if (id) {
      const person = people.find(p => p.id === id);
      if (person) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedPerson(person);
         
        setPersonActiveTab(tab);
      }
    }
  }, [people]);

  const updateURL = useCallback((personId: string | null, tab: string) => {
    const url = new URL(window.location.href);
    if (personId) {
      url.searchParams.set('id', personId);
      url.searchParams.set('tab', tab);
    } else {
      url.searchParams.delete('id');
      url.searchParams.delete('tab');
    }
    window.history.replaceState(null, '', url.toString());
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchPeople(query);
  };

  const handleSelect = (person: Person) => {
    setDrillTarget(null);
    const next = selectedPerson?.id === person.id ? null : person;
    setSelectedPerson(next);
    if (next) {
      setPersonActiveTab('profile');
      updateURL(next.id, 'profile');
    } else {
      updateURL(null, 'profile');
    }
  };

  const handleTabChange = useCallback((tab: string) => {
    setPersonActiveTab(tab);
    if (selectedPerson) updateURL(selectedPerson.id, tab);
  }, [selectedPerson, updateURL]);

  const handleOpenProject = (p: Project) => {
    savedTabRef.current = personActiveTab;
    setDrillTarget({ type: 'project', item: p });
  };

  const handleOpenOrg = (o: Organization) => {
    savedTabRef.current = personActiveTab;
    setDrillTarget({ type: 'org', item: o });
  };

  const handleCloseDrill = () => {
    setPersonActiveTab(savedTabRef.current);
    if (selectedPerson) updateURL(selectedPerson.id, savedTabRef.current);
    setDrillTarget(null);
  };

  const selectedPersonId = selectedPerson?.id ?? null;

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        {/* Mobile header */}
        <MobilePageHeader
          title={t('title')}
          subtitle={people.length > 0 ? t('count', { count: people.length }) : undefined}
          rightAction={
            canCreate && !selectedPerson ? (
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                aria-label={t('actions.addPerson')}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <Plus className="h-5 w-5" aria-hidden />
              </button>
            ) : undefined
          }
        />

        {/* Desktop header */}
        <div className="hidden lg:block">
          <PageHeader
            title={t('title')}
            subtitle={people.length > 0 ? t('count', { count: people.length }) : undefined}
            search={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder={t('searchPeople')}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9"
                  aria-label={t('searchPeople')}
                />
              </div>
            }
            actions={
              canCreate ? (
                <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('addPerson')}
                </Button>
              ) : undefined
            }
          />
        </div>

        {selectedPerson && drillTarget ? (
          <div className="flex-1 overflow-hidden">
            {drillTarget.type === 'project' ? (
              <ProjectDetailPanel project={drillTarget.item} onClose={handleCloseDrill} />
            ) : (
              <OrgDetailPane organization={drillTarget.item} onClose={handleCloseDrill} />
            )}
          </div>
        ) : selectedPerson ? (
          <div className="flex-1 overflow-hidden">
            <PersonDetailPane
              person={selectedPerson}
              onClose={() => { setSelectedPerson(null); updateURL(null, 'profile'); }}
              onOpenProject={handleOpenProject}
              onOpenOrg={handleOpenOrg}
              activeTab={personActiveTab}
              onTabChange={handleTabChange}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{tCommon('loading')}</div>
            ) : people.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <p className="text-sm text-muted-foreground">{t('noPeopleFound')}</p>
                {canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    {t('addFirstPerson')}
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
