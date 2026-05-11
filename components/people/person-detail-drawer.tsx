'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Person, Organization, Project } from '@/lib/types/models';
import { BottomDrawer } from '@/components/ui/bottom-drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useProjectAssignmentsStore } from '@/lib/stores/project-assignments-store';
import { Gender, Language, FILM_COUNTRIES, AssignmentStatus } from '@/lib/types/models';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { ChevronLeft, Mail, Phone, MapPin, Trash2, Plus, Building2, ExternalLink, X } from 'lucide-react';
import { EntryMetadata } from '@/components/ui/entry-metadata';

interface PersonDetailContentProps {
  person: Person;
  onClose: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenOrg?: (org: Organization) => void;
}

function PersonDetailContent({ person, onClose, onOpenProject, onOpenOrg }: PersonDetailContentProps) {
  const [editedPerson, setEditedPerson] = useState<Person>(person);
  const [addingOrg, setAddingOrg] = useState(false);
  const [newOrgId, setNewOrgId] = useState<string | null>(null);
  const [addingToProject, setAddingToProject] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const lastPersonIdRef = useRef<string>(person.id);

  const updatePerson = usePeopleStore(state => state.updatePerson);
  const deletePerson = usePeopleStore(state => state.deletePerson);
  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);
  const projects = useProjectsStore(state => state.projects);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);
  const assignments = useProjectAssignmentsStore(state => state.assignments);
  const fetchAssignmentsByPerson = useProjectAssignmentsStore(state => state.fetchAssignmentsByPerson);
  const addAssignment = useProjectAssignmentsStore(state => state.addAssignment);

  useEffect(() => {
    if (lastPersonIdRef.current !== person.id) {
      lastPersonIdRef.current = person.id;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedPerson(person);
    }
    fetchAssignmentsByPerson(person.id);
    if (projects.length === 0) fetchProjects();
    if (organizations.length === 0) fetchOrganizations();
  }, [person.id, fetchAssignmentsByPerson, fetchProjects, projects.length, fetchOrganizations, organizations.length]);

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(editedPerson) !== JSON.stringify(person)) {
        updatePerson(person.id, editedPerson);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editedPerson, person, updatePerson]);

  const updateField = <K extends keyof Person>(field: K, value: Person[K]) => {
    setEditedPerson(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${person.name}?`)) {
      await deletePerson(person.id);
      onClose();
    }
  };

  const connectedOrg = organizations.find(o => o.id === editedPerson.organization_id) ?? null;
  const jobTypes = useJobTypesStore(s => s.jobTypes);
  const jobOptions = useMemo(() => jobTypes.map(j => ({ value: j.name, label: j.name })), [jobTypes]);
  const languageOptions = Object.values(Language).map(l => ({ value: l, label: l }));

  const getFaviconUrl = (website: string | null | undefined) => {
    if (!website) return null;
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    } catch { return null; }
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── COLUMN HEADER ROW ── */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Name & Position</div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Email</div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Phone</div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">City</div>
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Country</div>
      </div>

      {/* ── TITLE ROW ── */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-2 border-b items-center bg-white dark:bg-gray-950 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 min-w-0 text-left group">
          <ChevronLeft className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
          <div className="min-w-0">
            <div className="font-semibold truncate text-base group-hover:text-blue-600 transition-colors">{editedPerson.name}</div>
            {editedPerson.jobs?.[0] && <div className="text-xs text-gray-500 truncate">{editedPerson.jobs[0]}</div>}
          </div>
        </button>
        <div className="min-w-0">
          {editedPerson.email
            ? <a href={`mailto:${editedPerson.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 hover:underline truncate text-xs"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{editedPerson.email}</span></a>
            : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div className="min-w-0">
          {editedPerson.mobile_phone
            ? <a href={`tel:${editedPerson.mobile_phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-600 hover:underline truncate text-xs"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{editedPerson.mobile_phone}</span></a>
            : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div className="min-w-0">
          {editedPerson.address?.city
            ? <div className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0 text-gray-400" /><span className="truncate text-xs">{editedPerson.address.city}</span></div>
            : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div className="min-w-0 truncate text-xs text-gray-500">{editedPerson.address?.country || '—'}</div>
      </div>

      {/* ── INFO SECTION ── */}
      <div className="border-b px-4 py-3 grid grid-cols-3 gap-4 shrink-0">

        {/* Personal */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5">Personal</h3>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Full Name</Label><Input value={editedPerson.name} onChange={e => updateField('name', e.target.value)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Date of Birth</Label><Input type="date" value={editedPerson.date_of_birth || ''} onChange={e => updateField('date_of_birth', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Gender</Label>
            <Select value={editedPerson.gender || 'none'} onValueChange={v => updateField('gender', v === 'none' ? null : v as Gender)}>
              <SelectTrigger size="xs" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {Object.values(Gender).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Email</Label><Input type="email" value={editedPerson.email || ''} onChange={e => updateField('email', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Mobile</Label><Input type="tel" value={editedPerson.mobile_phone || ''} onChange={e => updateField('mobile_phone', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Work Phone</Label><Input type="tel" value={editedPerson.work_phone || ''} onChange={e => updateField('work_phone', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Website</Label><Input type="url" value={editedPerson.website || ''} onChange={e => updateField('website', e.target.value || null)} className="h-7 text-xs" /></div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5">Address</h3>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Street</Label><Input value={editedPerson.address?.street1 || ''} onChange={e => updateField('address', { ...editedPerson.address, street1: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Street 2</Label><Input value={editedPerson.address?.street2 || ''} onChange={e => updateField('address', { ...editedPerson.address, street2: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="grid grid-cols-[70px_1fr] gap-1">
            <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">ZIP</Label><Input value={editedPerson.address?.zip || ''} onChange={e => updateField('address', { ...editedPerson.address, zip: e.target.value || null })} className="h-7 text-xs" /></div>
            <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">City</Label><Input value={editedPerson.address?.city || ''} onChange={e => updateField('address', { ...editedPerson.address, city: e.target.value || null })} className="h-7 text-xs" /></div>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Country</Label>
            <SearchableSelect
              options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
              value={editedPerson.address?.country || null}
              onChange={v => updateField('address', { ...editedPerson.address, country: v })}
              placeholder="Search country..."
            />
          </div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Notes</Label><Textarea value={editedPerson.notes || ''} onChange={e => updateField('notes', e.target.value || null)} rows={3} className="text-xs resize-none" /></div>
        </div>

        {/* Professional + Financial */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5">Professional</h3>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Jobs (up to 3)</Label>
            <MultiSelect options={jobOptions} selected={editedPerson.jobs || []} onChange={jobs => updateField('jobs', jobs)}placeholder="Select jobs…" maxSelections={3} />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Languages</Label>
            <MultiSelect options={languageOptions} selected={editedPerson.languages || []} onChange={langs => updateField('languages', langs as Language[])} placeholder="Select languages…" />
          </div>
          <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5 pt-2">Financial</h3>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">VAT Number</Label><Input value={editedPerson.financial_details?.vat_number || ''} onChange={e => updateField('financial_details', { ...editedPerson.financial_details, id: editedPerson.financial_details?.id ?? '', vat_number: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Bank Name</Label><Input value={editedPerson.financial_details?.bank_name || ''} onChange={e => updateField('financial_details', { ...editedPerson.financial_details, id: editedPerson.financial_details?.id ?? '', bank_name: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">IBAN</Label><Input value={editedPerson.financial_details?.iban || ''} onChange={e => updateField('financial_details', { ...editedPerson.financial_details, id: editedPerson.financial_details?.id ?? '', iban: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">BIC / SWIFT</Label><Input value={editedPerson.financial_details?.bic || ''} onChange={e => updateField('financial_details', { ...editedPerson.financial_details, id: editedPerson.financial_details?.id ?? '', bic: e.target.value || null })} className="h-7 text-xs" /></div>
        </div>
      </div>

      {/* ── BOTTOM SECTIONS (scrollable) ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Organization */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-gray-500">Organization</span>
          {!connectedOrg && !addingOrg && (
            <Button size="sm" variant="ghost" onClick={() => setAddingOrg(true)} className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />Add Organization
            </Button>
          )}
        </div>
        <div className="px-4 py-2 border-b">
          {addingOrg && (
            <div className="flex gap-2 items-center mb-2">
              <SearchableSelect
                options={organizations.map(o => ({ id: o.id, label: o.name, sublabel: o.jobs?.[0] }))}
                value={newOrgId}
                onChange={setNewOrgId}
                placeholder="Search organization…"
                className="flex-1"
              />
              <Button size="sm" onClick={() => { if (newOrgId) { updateField('organization_id', newOrgId); } setAddingOrg(false); setNewOrgId(null); }} className="h-7 text-xs" disabled={!newOrgId}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingOrg(false); setNewOrgId(null); }} className="h-7 text-xs">Cancel</Button>
            </div>
          )}
          {!connectedOrg ? (
            <p className="text-xs text-gray-400 py-1">Not connected to any organization.</p>
          ) : (
            <div className="flex items-center gap-2 p-2 border rounded bg-gray-50 dark:bg-gray-800 text-xs">
              {getFaviconUrl(connectedOrg.website) && (
                <img src={getFaviconUrl(connectedOrg.website)!} alt="" className="h-5 w-5 rounded shrink-0" onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{connectedOrg.name}</div>
                {connectedOrg.jobs?.length ? <div className="text-gray-400 truncate">{connectedOrg.jobs.join(', ')}</div> : null}
              </div>
              <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {onOpenOrg && (
                <button type="button" onClick={() => onOpenOrg(connectedOrg)} className="text-gray-400 hover:text-blue-600 shrink-0" title="Open detail">
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={() => updateField('organization_id', null)} className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 shrink-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="px-4 py-2 border-b flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold uppercase text-gray-500">Projects</span>
          {!addingToProject && (
            <Button size="sm" variant="ghost" onClick={() => setAddingToProject(true)} className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />Assign to Project
            </Button>
          )}
        </div>

        <div className="px-4 py-2">
          {addingToProject && (
            <div className="border rounded p-3 space-y-2 bg-gray-50 dark:bg-gray-800 mb-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Project *</Label>
                <SearchableSelect
                  options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
                  value={newProjectId}
                  onChange={setNewProjectId}
                  placeholder="Search project…"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setAddingToProject(false); setNewProjectId(null); }} className="flex-1 h-7 text-xs">Cancel</Button>
                <Button size="sm" onClick={async () => {
                  if (!newProjectId) return;
                  const primaryJob = editedPerson.jobs?.[0] ?? null;
                  const getDept = useJobTypesStore.getState().getDepartmentForJob;
                  await addAssignment({ project_id: newProjectId, person_id: person.id, organization_id: null, role: primaryJob, department: primaryJob ? getDept(primaryJob) : null, availability: AssignmentStatus.Anfragen, notes: null });
                  setAddingToProject(false); setNewProjectId(null);
                }} className="flex-1 h-7 text-xs" disabled={!newProjectId}>Assign</Button>
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">Not assigned to any projects yet.</p>
          ) : (
            <div className="space-y-1">
              {assignments.map(a => {
                const project = projects.find(p => p.id === a.project_id);
                if (!project) return null;
                return (
                  <div key={a.id} className="p-2 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-gray-500">{project.project_number} · {project.status}</div>
                      <div className="text-gray-400 flex flex-wrap gap-x-2 mt-0.5">
                        {a.role && <span>{a.role}</span>}
                        {a.department && <span>· {a.department}</span>}
                        <span className="font-medium">· {a.availability}</span>
                        {a.notes && <span>· {a.notes}</span>}
                      </div>
                    </div>
                    {onOpenProject && (
                      <button type="button" onClick={() => onOpenProject(project)} className="text-gray-400 hover:text-blue-600 shrink-0 mt-0.5" title="Open project detail">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t bg-gray-50 dark:bg-gray-900 px-4 py-1.5 flex items-center justify-between shrink-0">
        <EntryMetadata createdAt={person.created_at} updatedAt={person.updated_at} userId={person.user_id} />
        <Button variant="ghost" size="sm" onClick={handleDelete} className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete Person">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Overlay drawer ────────────────────────────────────────────────────────────

interface PersonDetailDrawerProps {
  person: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDetailDrawer({ person, open, onOpenChange }: PersonDetailDrawerProps) {
  return (
    <BottomDrawer open={open} onOpenChange={onOpenChange}>
      <PersonDetailContent person={person} onClose={() => onOpenChange(false)} />
    </BottomDrawer>
  );
}

// ─── Inline pane ───────────────────────────────────────────────────────────────

interface PersonDetailPaneProps {
  person: Person;
  onClose: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenOrg?: (org: Organization) => void;
}

export function PersonDetailPane({ person, onClose, onOpenProject, onOpenOrg }: PersonDetailPaneProps) {
  return <PersonDetailContent person={person} onClose={onClose} onOpenProject={onOpenProject} onOpenOrg={onOpenOrg} />;
}
