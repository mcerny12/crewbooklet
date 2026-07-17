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
import { useIsMobile } from '@/lib/hooks/use-media-query';
import { PersonMobileDetail } from './person-mobile-detail';
import { DetailFrame, DesktopDetailSnapCanvas, DetailSlide } from '@/components/detail';
import { ProjectStatusBadge } from '@/components/ui/status-badge';

interface PersonDetailContentProps {
  person: Person;
  onClose: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenOrg?: (org: Organization) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

function PersonDetailContent({ person, onClose, onOpenProject, onOpenOrg, activeTab, onTabChange }: PersonDetailContentProps) {
  const isMobile = useIsMobile();
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

  if (isMobile) {
    return (
      <PersonMobileDetail
        person={person}
        editedPerson={editedPerson}
        updateField={updateField}
        onClose={onClose}
        onDelete={handleDelete}
        organizations={organizations}
        projects={projects}
        assignments={assignments}
        addAssignment={addAssignment}
        onOpenProject={onOpenProject}
        onOpenOrg={onOpenOrg}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    );
  }

  const fdBase = { id: editedPerson.financial_details?.id ?? '', ...editedPerson.financial_details };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background" data-cb-component="PersonDetailPane">

      {/* ── DETAIL HEADER ── */}
      <div className="shrink-0 border-b bg-card px-5 py-3 flex items-center gap-4">
        <button
          onClick={onClose}
          aria-label="Back to list"
          className="flex items-center gap-1 group text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] truncate">{editedPerson.name}</div>
          <div className="flex items-center gap-3 mt-0.5 text-[12px] text-muted-foreground flex-wrap">
            {editedPerson.jobs?.[0] && <span>{editedPerson.jobs[0]}</span>}
            {editedPerson.email && <a href={`mailto:${editedPerson.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary hover:underline"><Mail className="h-3 w-3" />{editedPerson.email}</a>}
            {editedPerson.mobile_phone && <a href={`tel:${editedPerson.mobile_phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary hover:underline"><Phone className="h-3 w-3" />{editedPerson.mobile_phone}</a>}
            {editedPerson.address?.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{editedPerson.address.city}{editedPerson.address.country ? `, ${editedPerson.address.country}` : ''}</span>}
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL SLIDE CANVAS — each slide holds 1–2 frames ── */}
      <DesktopDetailSnapCanvas ariaLabel="Person detail slides">

        <DetailSlide ariaLabel="Person basics and contact" tabLabel="Basics">
          <DetailFrame title="Basic Information" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5" data-cb-field="name">
              <Label className="text-[10px] text-gray-500">Full Name</Label>
              <Input value={editedPerson.name} onChange={e => updateField('name', e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Jobs (up to 3)</Label>
              <MultiSelect options={jobOptions} selected={editedPerson.jobs || []} onChange={jobs => updateField('jobs', jobs)} placeholder="Select jobs…" maxSelections={3} />
            </div>
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
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Date of Birth</Label>
              <Input type="date" value={editedPerson.date_of_birth || ''} onChange={e => updateField('date_of_birth', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Languages</Label>
              <MultiSelect options={languageOptions} selected={editedPerson.languages || []} onChange={langs => updateField('languages', langs as Language[])} placeholder="Select languages…" />
            </div>
          </div>
        </DetailFrame>

        <DetailFrame title="Contact" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5" data-cb-field="email">
              <Label className="text-[10px] text-gray-500">Email</Label>
              <Input type="email" value={editedPerson.email || ''} onChange={e => updateField('email', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5" data-cb-field="mobile-phone">
              <Label className="text-[10px] text-gray-500">Mobile</Label>
              <Input type="tel" value={editedPerson.mobile_phone || ''} onChange={e => updateField('mobile_phone', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Work Phone</Label>
              <Input type="tel" value={editedPerson.work_phone || ''} onChange={e => updateField('work_phone', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Website</Label>
              <Input type="url" value={editedPerson.website || ''} onChange={e => updateField('website', e.target.value || null)} className="h-7 text-xs" />
            </div>
          </div>
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Person projects" tabLabel="Projects">
        <DetailFrame
          title="Projects"
          description={assignments.length > 0 ? `${assignments.length} assignment${assignments.length === 1 ? '' : 's'}` : undefined}
          className="flex-1"
          action={
            !addingToProject ? (
              <Button size="sm" variant="ghost" onClick={() => setAddingToProject(true)} className="h-7 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />Assign to Project
              </Button>
            ) : null
          }
        >
          {addingToProject && (
            <div className="mb-3 rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Project</Label>
                <SearchableSelect
                  options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
                  value={newProjectId}
                  onChange={setNewProjectId}
                  placeholder="Search project…"
                  showOptionsWhenEmpty
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setAddingToProject(false); setNewProjectId(null); }} className="flex-1 h-7 text-xs">Cancel</Button>
                <Button size="sm" disabled={!newProjectId} onClick={async () => {
                  if (!newProjectId) return;
                  const primaryJob = editedPerson.jobs?.[0] ?? null;
                  const getDept = useJobTypesStore.getState().getDepartmentForJob;
                  await addAssignment({ project_id: newProjectId, person_id: person.id, organization_id: null, role: primaryJob, department: primaryJob ? getDept(primaryJob) : null, availability: AssignmentStatus.Anfragen, notes: null });
                  setAddingToProject(false); setNewProjectId(null);
                }} className="flex-1 h-7 text-xs">Assign</Button>
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">Not assigned to any projects yet.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[2fr_0.8fr_1.2fr_1fr_1fr_1.4fr_auto] gap-2 px-2 py-1 border-b text-[10px] font-semibold uppercase text-muted-foreground sticky top-0 bg-card">
                <div>Project</div>
                <div>Number</div>
                <div>Role</div>
                <div>Dept</div>
                <div>Status</div>
                <div>Availability</div>
                <div />
              </div>
              {assignments.map(a => {
                const project = projects.find(p => p.id === a.project_id);
                if (!project) return null;
                return (
                  <div key={a.id} className="grid grid-cols-[2fr_0.8fr_1.2fr_1fr_1fr_1.4fr_auto] gap-2 px-2 py-1.5 border rounded text-xs items-center hover:bg-muted/30">
                    <div className="font-medium truncate" title={project.name}>{project.name}</div>
                    <div className="text-muted-foreground truncate">{project.project_number}</div>
                    <div className="truncate" title={a.role ?? undefined}>{a.role || <span className="text-muted-foreground">—</span>}</div>
                    <div className="truncate text-muted-foreground">{a.department || <span>—</span>}</div>
                    <div><ProjectStatusBadge status={project.status} /></div>
                    <div className="truncate" title={a.notes ?? undefined}>
                      <span className="font-medium">{a.availability}</span>
                      {a.notes ? <span className="text-muted-foreground"> · {a.notes}</span> : null}
                    </div>
                    <div className="flex justify-end">
                      {onOpenProject && (
                        <button
                          type="button"
                          onClick={() => onOpenProject(project)}
                          className="text-muted-foreground hover:text-primary"
                          title="Open project detail"
                          aria-label={`Open ${project.name}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Person address and organization" tabLabel="Address">
        <DetailFrame title="Address" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Street</Label>
              <Input value={editedPerson.address?.street1 || ''} onChange={e => updateField('address', { ...editedPerson.address, street1: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Street 2</Label>
              <Input value={editedPerson.address?.street2 || ''} onChange={e => updateField('address', { ...editedPerson.address, street2: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="grid grid-cols-[70px_1fr] gap-1">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">ZIP</Label>
                <Input value={editedPerson.address?.zip || ''} onChange={e => updateField('address', { ...editedPerson.address, zip: e.target.value || null })} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">City</Label>
                <Input value={editedPerson.address?.city || ''} onChange={e => updateField('address', { ...editedPerson.address, city: e.target.value || null })} className="h-7 text-xs" />
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Country</Label>
              <SearchableSelect
                options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty
                value={editedPerson.address?.country || null}
                onChange={v => updateField('address', { ...editedPerson.address, country: v })}
                placeholder="Search country..."
              />
            </div>
          </div>
        </DetailFrame>

        <DetailFrame
          title="Organization"
          className="flex-1"
          action={!connectedOrg && !addingOrg ? (
            <Button size="sm" variant="ghost" onClick={() => setAddingOrg(true)} className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />Link
            </Button>
          ) : null}
        >
          {addingOrg ? (
            <div className="space-y-2">
              <SearchableSelect
                options={organizations.map(o => ({ id: o.id, label: o.name, sublabel: o.jobs?.[0] }))}
                value={newOrgId}
                onChange={setNewOrgId}
                placeholder="Search organization…"
                showOptionsWhenEmpty
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setAddingOrg(false); setNewOrgId(null); }} className="flex-1 h-7 text-xs">Cancel</Button>
                <Button size="sm" disabled={!newOrgId} onClick={() => { if (newOrgId) updateField('organization_id', newOrgId); setAddingOrg(false); setNewOrgId(null); }} className="flex-1 h-7 text-xs">Link</Button>
              </div>
            </div>
          ) : !connectedOrg ? (
            <p className="text-xs text-gray-400 py-1">Not connected to any organization.</p>
          ) : (
            <div className="flex items-center gap-2 p-2 border rounded bg-muted/30 text-xs">
              {getFaviconUrl(connectedOrg.website) && (
                <img src={getFaviconUrl(connectedOrg.website)!} alt="" className="h-5 w-5 rounded shrink-0" onError={e => { e.currentTarget.style.display = 'none'; }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{connectedOrg.name}</div>
                {connectedOrg.jobs?.length ? <div className="text-muted-foreground truncate">{connectedOrg.jobs.join(', ')}</div> : null}
              </div>
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              {onOpenOrg && (
                <button type="button" onClick={() => onOpenOrg(connectedOrg)} className="text-muted-foreground hover:text-primary shrink-0" title="Open detail">
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={() => updateField('organization_id', null)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Person financial and notes" tabLabel="Financial">
        <DetailFrame title="Financial" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5" data-cb-field="vat">
              <Label className="text-[10px] text-gray-500">VAT Number</Label>
              <Input value={editedPerson.financial_details?.vat_number || ''} onChange={e => updateField('financial_details', { ...fdBase, vat_number: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Bank Name</Label>
              <Input value={editedPerson.financial_details?.bank_name || ''} onChange={e => updateField('financial_details', { ...fdBase, bank_name: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5" data-cb-field="iban">
              <Label className="text-[10px] text-gray-500">IBAN</Label>
              <Input value={editedPerson.financial_details?.iban || ''} onChange={e => updateField('financial_details', { ...fdBase, iban: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">BIC / SWIFT</Label>
              <Input value={editedPerson.financial_details?.bic || ''} onChange={e => updateField('financial_details', { ...fdBase, bic: e.target.value || null })} className="h-7 text-xs" />
            </div>
          </div>
        </DetailFrame>

        <DetailFrame
          title="Notes / Metadata"
          className="flex-1"
          action={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
              aria-label="Delete person"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <div className="flex h-full flex-col gap-3 detail-form-fields">
            <div className="space-y-0.5 flex-1 min-h-0 flex flex-col">
              <Label className="text-[10px] text-gray-500">Notes</Label>
              <Textarea
                value={editedPerson.notes || ''}
                onChange={e => updateField('notes', e.target.value || null)}
                className="flex-1 text-xs resize-none min-h-20"
              />
            </div>
            <div className="border-t pt-2">
              <EntryMetadata createdAt={person.created_at} updatedAt={person.updated_at} userId={person.user_id} />
            </div>
          </div>
        </DetailFrame>
        </DetailSlide>

      </DesktopDetailSnapCanvas>
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
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function PersonDetailPane({ person, onClose, onOpenProject, onOpenOrg, activeTab, onTabChange }: PersonDetailPaneProps) {
  return <PersonDetailContent person={person} onClose={onClose} onOpenProject={onOpenProject} onOpenOrg={onOpenOrg} activeTab={activeTab} onTabChange={onTabChange} />;
}
