'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectAssignmentsStore } from '@/lib/stores/project-assignments-store';
import { AssignmentStatus, CrewDepartment, FILM_COUNTRIES, type Person } from '@/lib/types/models';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { X, Check, ExternalLink } from 'lucide-react';
import { PersonDetailDrawer } from '@/components/people/person-detail-drawer';

interface AddCrewDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCrewDialog({ projectId, open, onOpenChange }: AddCrewDialogProps) {
  const people = usePeopleStore(state => state.people);
  const addAssignment = useProjectAssignmentsStore(state => state.addAssignment);

  const [searchName, setSearchName] = useState('');
  const [searchJob, setSearchJob] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  // Multi-select: set of selected person IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewPerson, setPreviewPerson] = useState<Person | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const getDepartmentForJob = useJobTypesStore(s => s.getDepartmentForJob);
  const _jobTypes = useJobTypesStore(s => s.jobTypes);
  const jobTypeNames = useMemo(() => _jobTypes.map(j => j.name), [_jobTypes]);

  const hasFilter = searchName.trim() || searchJob || searchDept || searchCity.trim() || searchCountry;

  const results = useMemo(() => {
    if (!hasFilter) return [];
    return people.filter(p => {
      if (searchName.trim() && !p.name.toLowerCase().includes(searchName.trim().toLowerCase())) return false;
      if (searchJob && !(p.jobs ?? []).includes(searchJob)) return false;
      if (searchDept && !(p.jobs ?? []).some(j => getDepartmentForJob(j) === searchDept)) return false;
      if (searchCity.trim() && !(p.address?.city ?? '').toLowerCase().includes(searchCity.trim().toLowerCase())) return false;
      if (searchCountry && (p.address?.country ?? '') !== searchCountry) return false;
      return true;
    });
  }, [people, searchName, searchJob, searchDept, searchCity, searchCountry, hasFilter, getDepartmentForJob]);

  const togglePerson = (person: Person) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(person.id)) { next.delete(person.id); } else { next.add(person.id); }
      return next;
    });
  };

  const reset = () => {
    setSearchName('');
    setSearchJob('');
    setSearchDept('');
    setSearchCity('');
    setSearchCountry('');
    setSelectedIds(new Set());
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    const selected = people.filter(p => selectedIds.has(p.id));
    await Promise.all(selected.map(person => {
      const primaryJob = person.jobs?.[0] ?? null;
      const dept = primaryJob ? getDepartmentForJob(primaryJob) : null;
      return addAssignment({
        project_id: projectId,
        person_id: person.id,
        organization_id: null,
        role: primaryJob,
        department: dept,
        availability: AssignmentStatus.Anfragen,
        notes: null,
      });
    }));
    setIsAdding(false);
    reset();
    onOpenChange(false);
  };

  if (!open) return null;

  const selectedCount = selectedIds.size;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full mx-4" style={{ maxWidth: '1056px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Add Crew Member</h2>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search filters — changing filters no longer clears selection */}
        <div className="px-6 pt-6 pb-5">
          <div className="grid grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Name</Label>
              <Input
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="e.g. John Smith"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Role / Job</Label>
              <Select value={searchJob || 'any'} onValueChange={v => setSearchJob(v === 'any' ? '' : v)}>
                <SelectTrigger size="xs" className="w-full"><SelectValue placeholder="Any role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any role</SelectItem>
                  {jobTypeNames.map(j => <SelectItem key={j} value={j} className="whitespace-nowrap">{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Department</Label>
              <Select value={searchDept || 'any'} onValueChange={v => setSearchDept(v === 'any' ? '' : v)}>
                <SelectTrigger size="xs" className="w-full"><SelectValue placeholder="Any dept" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any dept</SelectItem>
                  {Object.values(CrewDepartment).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">City</Label>
              <Input
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                placeholder="e.g. Berlin"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Country</Label>
              <Select value={searchCountry || 'any'} onValueChange={v => setSearchCountry(v === 'any' ? '' : v)}>
                <SelectTrigger size="xs" className="w-full"><SelectValue placeholder="Any country" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any country</SelectItem>
                  {FILM_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 pb-3">
          {!hasFilter ? (
            <div className="text-xs text-gray-400 text-center py-6 border border-dashed rounded-lg">
              Enter a name, role, department or city above to find people
            </div>
          ) : results.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-6 border border-dashed rounded-lg">
              No people match your search
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {results.map(p => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => togglePerson(p)}
                    >
                      <div className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-medium">{p.name}</span>
                        {p.address?.city ? <span className="text-gray-400 ml-2">· {p.address.city}</span> : null}
                        {p.address?.country ? <span className="text-gray-400 ml-1">({p.address.country})</span> : null}
                        {p.jobs?.length ? <span className="text-gray-400 ml-2">· {p.jobs.join(', ')}</span> : null}
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setPreviewPerson(p); }}
                        className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
                        title="Preview person"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {selectedCount === 0 ? (
              'No one selected — click names to select'
            ) : (
              <span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedCount}</span>
                {' '}person{selectedCount > 1 ? 's' : ''} selected
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-2 text-gray-400 hover:text-gray-600 underline"
                  >
                    clear
                  </button>
                )}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="h-7 text-xs px-4">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={selectedCount === 0 || isAdding} className="h-7 text-xs px-4">
              {isAdding ? 'Adding…' : `Add ${selectedCount > 0 ? selectedCount : ''} to Project`}
            </Button>
          </div>
        </div>

      </div>
    </div>

    {previewPerson && (
      <PersonDetailDrawer
        person={previewPerson}
        open={!!previewPerson}
        onOpenChange={v => { if (!v) setPreviewPerson(null); }}
      />
    )}
    </>
  );
}
