'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { useProjectAssignmentsStore } from '@/lib/stores/project-assignments-store';
import { AssignmentStatus, OrganizationJobType, FILM_COUNTRIES, type Organization } from '@/lib/types/models';
import { X, Check, ExternalLink } from 'lucide-react';
import { OrganizationDetailDrawer } from '@/components/organizations/organization-detail-drawer';

interface AddOrgToProjectDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddOrgToProjectDialog({ projectId, open, onOpenChange }: AddOrgToProjectDialogProps) {
  const organizations = useOrganizationsStore(state => state.organizations);
  const addAssignment = useProjectAssignmentsStore(state => state.addAssignment);

  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [previewOrg, setPreviewOrg] = useState<Organization | null>(null);

  const hasFilter = searchName.trim() || searchType || searchCity.trim() || searchCountry;

  const results = useMemo(() => {
    if (!hasFilter) return [];
    return organizations.filter(o => {
      if (searchName.trim() && !o.name.toLowerCase().includes(searchName.trim().toLowerCase())) return false;
      if (searchType && !(o.jobs ?? []).includes(searchType as OrganizationJobType)) return false;
      if (searchCity.trim() && !(o.city ?? '').toLowerCase().includes(searchCity.trim().toLowerCase())) return false;
      if (searchCountry && (o.country ?? '') !== searchCountry) return false;
      return true;
    });
  }, [organizations, searchName, searchType, searchCity, searchCountry, hasFilter]);

  const reset = () => {
    setSearchName('');
    setSearchType('');
    setSearchCity('');
    setSearchCountry('');
    setSelectedOrg(null);
  };

  const handleAdd = async () => {
    if (!selectedOrg) return;
    const result = await addAssignment({
      project_id: projectId,
      person_id: null,
      organization_id: selectedOrg.id,
      role: null,
      department: null,
      availability: AssignmentStatus.Anfragen,
      notes: null,
    });
    if (result) { reset(); onOpenChange(false); }
  };

  if (!open) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full mx-4" style={{ maxWidth: '1056px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Add Organisation</h2>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search filters */}
        <div className="px-6 pt-6 pb-5">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Name</Label>
              <Input
                value={searchName}
                onChange={(e) => { setSearchName(e.target.value); setSelectedOrg(null); }}
                placeholder="e.g. Studio Berlin"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Type</Label>
              <Select value={searchType || 'any'} onValueChange={(v) => { setSearchType(v === 'any' ? '' : v); setSelectedOrg(null); }}>
                <SelectTrigger size="xs" className="w-full"><SelectValue placeholder="Any type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {Object.values(OrganizationJobType).map(t => <SelectItem key={t} value={t} className="whitespace-nowrap">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">City</Label>
              <Input
                value={searchCity}
                onChange={(e) => { setSearchCity(e.target.value); setSelectedOrg(null); }}
                placeholder="e.g. Berlin"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">Country</Label>
              <Select value={searchCountry || 'any'} onValueChange={(v) => { setSearchCountry(v === 'any' ? '' : v); setSelectedOrg(null); }}>
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
              Enter a name, type, city or country above to find organisations
            </div>
          ) : results.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-6 border border-dashed rounded-lg">
              No organisations match your search
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {results.map(o => {
                  const isSelected = selectedOrg?.id === o.id;
                  return (
                    <div
                      key={o.id}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedOrg(isSelected ? null : o)}
                        className="flex-1 text-left min-w-0"
                      >
                        <span className="font-medium">{o.name}</span>
                        {o.city ? <span className="text-gray-400 ml-2">· {o.city}</span> : null}
                        {o.country ? <span className="text-gray-400 ml-1">({o.country})</span> : null}
                        {o.jobs?.length ? <span className="text-gray-400 ml-2">· {o.jobs.join(', ')}</span> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewOrg(o)}
                        className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
                        title="Preview organisation"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {selectedOrg ? (
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedOrg.name} selected</span>
            ) : (
              'No organisation selected'
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="h-7 text-xs px-4">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedOrg} className="h-7 text-xs px-4">
              Add to Project
            </Button>
          </div>
        </div>

      </div>
    </div>

    {previewOrg && (
      <OrganizationDetailDrawer
        organization={previewOrg}
        open={!!previewOrg}
        onOpenChange={(v) => { if (!v) setPreviewOrg(null); }}
      />
    )}
    </>
  );
}
