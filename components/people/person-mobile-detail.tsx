'use client';

import { useState, useMemo } from 'react';
import type { Person, Organization, Project } from '@/lib/types/models';
import { Gender, Language, FILM_COUNTRIES, AssignmentStatus } from '@/lib/types/models';
import type { ProjectAssignment } from '@/lib/types/models';
import { MobileEntityDetailLayout } from '@/components/mobile/mobile-entity-detail-layout';
import { MobileSwipeTabs } from '@/components/mobile/mobile-swipe-tabs';
import type { MobileSwipeTab } from '@/components/mobile/mobile-swipe-tabs';
import { MobileField, mobileInputCn, mobileTextareaCn } from '@/components/mobile/mobile-field';
import { MobileEmptyState } from '@/components/mobile/mobile-empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { Trash2, Plus, X, ExternalLink, Mail, Phone, Briefcase, Building2 } from 'lucide-react';

export type PersonMobileDetailProps = {
  person: Person;
  editedPerson: Person;
  updateField: <K extends keyof Person>(field: K, value: Person[K]) => void;
  onClose: () => void;
  onDelete: () => void;
  organizations: Organization[];
  projects: Project[];
  assignments: ProjectAssignment[];
  addAssignment: (data: Partial<ProjectAssignment>) => Promise<unknown>;
  onOpenProject?: (project: Project) => void;
  onOpenOrg?: (org: Organization) => void;
};

// ── Profile tab ────────────────────────────────────────────────

function ProfileTab({ editedPerson, updateField, organizations, onOpenOrg }: {
  editedPerson: Person;
  updateField: <K extends keyof Person>(field: K, value: Person[K]) => void;
  organizations: Organization[];
  onOpenOrg?: (org: Organization) => void;
}) {
  const jobTypes = useJobTypesStore(s => s.jobTypes);
  const jobOptions = useMemo(() => jobTypes.map(j => ({ value: j.name, label: j.name })), [jobTypes]);
  const languageOptions = Object.values(Language).map(l => ({ value: l, label: l }));
  const connectedOrg = organizations.find(o => o.id === editedPerson.organization_id) ?? null;

  const [addingOrg, setAddingOrg] = useState(false);
  const [newOrgId, setNewOrgId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <MobileField label="Full Name">
        <Input value={editedPerson.name} onChange={e => updateField('name', e.target.value)} className={mobileInputCn} />
      </MobileField>

      <MobileField label="Jobs (up to 3)">
        <MultiSelect
          options={jobOptions}
          selected={editedPerson.jobs || []}
          onChange={jobs => updateField('jobs', jobs)}
          placeholder="Select jobs…"
          maxSelections={3}
        />
      </MobileField>

      <MobileField label="Email">
        <Input type="email" value={editedPerson.email || ''} onChange={e => updateField('email', e.target.value || null)} className={mobileInputCn} />
      </MobileField>

      <MobileField label="Mobile Phone">
        <Input type="tel" value={editedPerson.mobile_phone || ''} onChange={e => updateField('mobile_phone', e.target.value || null)} className={mobileInputCn} />
      </MobileField>

      <MobileField label="Work Phone">
        <Input type="tel" value={editedPerson.work_phone || ''} onChange={e => updateField('work_phone', e.target.value || null)} className={mobileInputCn} />
      </MobileField>

      <MobileField label="Website">
        <Input type="url" value={editedPerson.website || ''} onChange={e => updateField('website', e.target.value || null)} className={mobileInputCn} />
      </MobileField>

      <div className="grid grid-cols-2 gap-3">
        <MobileField label="Gender">
          <Select value={editedPerson.gender || 'none'} onValueChange={v => updateField('gender', v === 'none' ? null : v as Gender)}>
            <SelectTrigger className={mobileInputCn}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {Object.values(Gender).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </MobileField>

        <MobileField label="Date of Birth">
          <Input type="date" value={editedPerson.date_of_birth || ''} onChange={e => updateField('date_of_birth', e.target.value || null)} className={mobileInputCn} />
        </MobileField>
      </div>

      <MobileField label="Languages">
        <MultiSelect
          options={languageOptions}
          selected={editedPerson.languages || []}
          onChange={langs => updateField('languages', langs as Language[])}
          placeholder="Select languages…"
        />
      </MobileField>

      {/* Organization */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Organization</p>
        {connectedOrg ? (
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
            <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{connectedOrg.name}</p>
              {connectedOrg.jobs?.length ? <p className="truncate text-xs text-muted-foreground">{connectedOrg.jobs.join(', ')}</p> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              {onOpenOrg && (
                <button type="button" onClick={() => onOpenOrg(connectedOrg)} aria-label="Open organization detail"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={() => updateField('organization_id', null)} aria-label="Remove organization"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : addingOrg ? (
          <div className="flex gap-2">
            <SearchableSelect
              options={organizations.map(o => ({ id: o.id, label: o.name, sublabel: o.jobs?.[0] }))}
              value={newOrgId}
              onChange={setNewOrgId}
              placeholder="Search organization…"
              className="flex-1"
            />
            <Button size="sm" disabled={!newOrgId} onClick={() => { if (newOrgId) updateField('organization_id', newOrgId); setAddingOrg(false); setNewOrgId(null); }} className="h-9 rounded-lg">Link</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingOrg(false); setNewOrgId(null); }} className="h-9 rounded-lg">Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAddingOrg(true)} className="w-full h-9 rounded-lg gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Link Organization
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Address tab ────────────────────────────────────────────────

function AddressTab({ editedPerson, updateField }: {
  editedPerson: Person;
  updateField: <K extends keyof Person>(field: K, value: Person[K]) => void;
}) {
  const addr = editedPerson.address;
  const update = (patch: Partial<typeof addr>) => updateField('address', { ...addr, ...patch });

  return (
    <div className="space-y-3">
      <MobileField label="Street">
        <Input value={addr?.street1 || ''} onChange={e => update({ street1: e.target.value || null })} className={mobileInputCn} />
      </MobileField>
      <MobileField label="Street 2">
        <Input value={addr?.street2 || ''} onChange={e => update({ street2: e.target.value || null })} className={mobileInputCn} />
      </MobileField>
      <div className="grid grid-cols-[100px_1fr] gap-3">
        <MobileField label="ZIP">
          <Input value={addr?.zip || ''} onChange={e => update({ zip: e.target.value || null })} className={mobileInputCn} />
        </MobileField>
        <MobileField label="City">
          <Input value={addr?.city || ''} onChange={e => update({ city: e.target.value || null })} className={mobileInputCn} />
        </MobileField>
      </div>
      <MobileField label="Country">
        <SearchableSelect
          options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
          value={addr?.country || null}
          onChange={v => update({ country: v })}
          placeholder="Search country..."
        />
      </MobileField>
      <MobileField label="Notes">
        <Textarea value={editedPerson.notes || ''} onChange={e => updateField('notes', e.target.value || null)} className={mobileTextareaCn} rows={4} />
      </MobileField>
    </div>
  );
}

// ── Projects tab ───────────────────────────────────────────────

function ProjectsTab({ person, editedPerson, projects, assignments, addAssignment, onOpenProject }: {
  person: Person;
  editedPerson: Person;
  projects: Project[];
  assignments: ProjectAssignment[];
  addAssignment: (data: Partial<ProjectAssignment>) => Promise<unknown>;
  onOpenProject?: (project: Project) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const getDept = useJobTypesStore(s => s.getDepartmentForJob);

  return (
    <div className="space-y-3">
      {adding ? (
        <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-sm font-medium">Assign to project</p>
          <SearchableSelect
            options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
            value={newProjectId}
            onChange={setNewProjectId}
            placeholder="Search project…"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAdding(false); setNewProjectId(null); }} className="flex-1 h-9 rounded-lg">Cancel</Button>
            <Button disabled={!newProjectId} onClick={async () => {
              if (!newProjectId) return;
              const primaryJob = editedPerson.jobs?.[0] ?? null;
              await addAssignment({ project_id: newProjectId, person_id: person.id, organization_id: null, role: primaryJob, department: primaryJob ? getDept(primaryJob) : null, availability: AssignmentStatus.Anfragen, notes: null });
              setAdding(false); setNewProjectId(null);
            }} className="flex-1 h-9 rounded-lg">Assign</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} className="w-full h-9 rounded-lg gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Assign to Project
        </Button>
      )}

      {assignments.length === 0 ? (
        <MobileEmptyState
          icon={<Briefcase className="h-8 w-8" />}
          title="No project assignments"
          description="Assign this person to a project."
        />
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const project = projects.find(p => p.id === a.project_id);
            if (!project) return null;
            return (
              <div key={a.id} className="rounded-xl border bg-card p-3 shadow-sm space-y-2">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.project_number}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ProjectStatusBadge status={project.status} />
                    {onOpenProject && (
                      <button type="button" onClick={() => onOpenProject(project)} aria-label={`Open ${project.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {a.role && <span>{a.role}</span>}
                  {a.department && <span>· {a.department}</span>}
                  <span className="font-medium">· {a.availability}</span>
                  {a.notes && <span>· {a.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Financial / Meta tab ───────────────────────────────────────

function FinancialMetaTab({ editedPerson, updateField, person, onDelete }: {
  editedPerson: Person;
  updateField: <K extends keyof Person>(field: K, value: Person[K]) => void;
  person: Person;
  onDelete: () => void;
}) {
  const fd = editedPerson.financial_details;
  const baseFd = { id: fd?.id ?? '', ...fd };

  return (
    <div className="space-y-3">
      <MobileField label="VAT Number">
        <Input value={fd?.vat_number || ''} onChange={e => updateField('financial_details', { ...baseFd, vat_number: e.target.value || null })} className={mobileInputCn} />
      </MobileField>
      <MobileField label="Bank Name">
        <Input value={fd?.bank_name || ''} onChange={e => updateField('financial_details', { ...baseFd, bank_name: e.target.value || null })} className={mobileInputCn} />
      </MobileField>
      <MobileField label="IBAN">
        <Input value={fd?.iban || ''} onChange={e => updateField('financial_details', { ...baseFd, iban: e.target.value || null })} className={mobileInputCn} />
      </MobileField>
      <MobileField label="BIC / SWIFT">
        <Input value={fd?.bic || ''} onChange={e => updateField('financial_details', { ...baseFd, bic: e.target.value || null })} className={mobileInputCn} />
      </MobileField>

      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <EntryMetadata createdAt={person.created_at} updatedAt={person.updated_at} userId={person.user_id} />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete Person
      </button>
    </div>
  );
}

// ── Summary card ───────────────────────────────────────────────

function PersonSummaryCard({ person }: { person: Person }) {
  const hasContact = person.email || person.mobile_phone;
  if (!hasContact && !person.jobs?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {person.jobs?.length ? (
        <span className="text-muted-foreground">{person.jobs.slice(0, 2).join(' · ')}</span>
      ) : null}
      {person.email && (
        <a href={`mailto:${person.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{person.email}</span>
        </a>
      )}
      {person.mobile_phone && (
        <a href={`tel:${person.mobile_phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{person.mobile_phone}</span>
        </a>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────

export function PersonMobileDetail({
  person, editedPerson, updateField, onClose, onDelete,
  organizations, projects, assignments, addAssignment,
  onOpenProject, onOpenOrg,
}: PersonMobileDetailProps) {
  const tabs: MobileSwipeTab[] = [
    {
      value: 'profile',
      label: 'Profile',
      content: (
        <ProfileTab
          editedPerson={editedPerson}
          updateField={updateField}
          organizations={organizations}
          onOpenOrg={onOpenOrg}
        />
      ),
    },
    {
      value: 'address',
      label: 'Address',
      content: <AddressTab editedPerson={editedPerson} updateField={updateField} />,
    },
    {
      value: 'projects',
      label: 'Projects',
      badge: assignments.length > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
          {assignments.length}
        </span>
      ) : undefined,
      content: (
        <ProjectsTab
          person={person}
          editedPerson={editedPerson}
          projects={projects}
          assignments={assignments}
          addAssignment={addAssignment}
          onOpenProject={onOpenProject}
        />
      ),
    },
    {
      value: 'financial',
      label: 'Financial',
      content: (
        <FinancialMetaTab
          editedPerson={editedPerson}
          updateField={updateField}
          person={person}
          onDelete={onDelete}
        />
      ),
    },
  ];

  return (
    <MobileEntityDetailLayout
      title={editedPerson.name}
      onBack={onClose}
      summary={<PersonSummaryCard person={editedPerson} />}
    >
      <MobileSwipeTabs tabs={tabs} defaultValue="profile" className="h-full" />
    </MobileEntityDetailLayout>
  );
}
