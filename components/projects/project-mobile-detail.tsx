'use client';

import type { Project, Organization, ProjectAssignment, AssignmentStatus as AssignmentStatusType } from '@/lib/types/models';
import { AssignmentStatus, CrewDepartment, FILM_COUNTRIES, ProjectStatus } from '@/lib/types/models';
import { MobileEntityDetailLayout } from '@/components/mobile/mobile-entity-detail-layout';
import { MobileSwipeTabs } from '@/components/mobile/mobile-swipe-tabs';
import type { MobileSwipeTab } from '@/components/mobile/mobile-swipe-tabs';
import { MobileField, mobileInputCn, mobileTextareaCn } from '@/components/mobile/mobile-field';
import { MobileEmptyState } from '@/components/mobile/mobile-empty-state';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { InlineDateRangePicker } from '@/components/ui/date-range-picker';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { Trash2, Plus, X, Search, CalendarDays, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

// ── types ──────────────────────────────────────────────────────

export type ProjectMobileDetailProps = {
  project: Project;
  editedProject: Project;
  updateField: <K extends keyof Project>(field: K, value: Project[K]) => void;
  onClose: () => void;
  onDelete: () => void;
  organizations: Organization[];
  people: { id: string; name: string }[];
  assignments: ProjectAssignment[];
  filteredAssignments: ProjectAssignment[];
  crewFilter: string;
  setCrewFilter: (v: string) => void;
  crewDeptFilter: string;
  setCrewDeptFilter: (v: string) => void;
  jobTypeNames: string[];
  getDepartmentForJob: (name: string) => CrewDepartment | null;
  updateAssignment: (id: string, updates: Partial<ProjectAssignment>) => void;
  deleteAssignment: (id: string) => Promise<void>;
  onAddCrew: () => void;
  onAddOrg: () => void;
};

// ── helpers ────────────────────────────────────────────────────

function getDisplayName(a: ProjectAssignment, people: { id: string; name: string }[], organizations: Organization[]) {
  return (a.person_id ? people.find(p => p.id === a.person_id)?.name : null)
    ?? (a.organization_id ? organizations.find(o => o.id === a.organization_id)?.name : null)
    ?? 'Unknown';
}

function formatDate(s: string | null | undefined) {
  if (!s) return null;
  try { return format(new Date(s), 'MMM d, yyyy'); } catch { return null; }
}

const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  [AssignmentStatus.Verfuegbar]:   'bg-green-100 text-green-700',
  [AssignmentStatus.Angefragt]:    'bg-yellow-100 text-yellow-700',
  [AssignmentStatus.Gebucht]:      'bg-blue-100 text-blue-700',
  [AssignmentStatus.ErsteOption]:  'bg-purple-100 text-purple-700',
};

// ── sub-components ─────────────────────────────────────────────

function MobileCrewCard({
  assignment, people, organizations, jobTypeNames, getDepartmentForJob, updateAssignment, deleteAssignment,
}: {
  assignment: ProjectAssignment;
  people: { id: string; name: string }[];
  organizations: Organization[];
  jobTypeNames: string[];
  getDepartmentForJob: (name: string) => CrewDepartment | null;
  updateAssignment: (id: string, updates: Partial<ProjectAssignment>) => void;
  deleteAssignment: (id: string) => Promise<void>;
}) {
  const displayName = getDisplayName(assignment, people, organizations);
  const isOrg = !!assignment.organization_id && !assignment.person_id;

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{displayName}</h3>
          {isOrg && <p className="text-xs text-muted-foreground">Organization</p>}
        </div>
        <button
          type="button"
          aria-label={`Remove ${displayName} from project`}
          onClick={async () => {
            if (confirm(`Remove ${displayName} from this project?`)) await deleteAssignment(assignment.id);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3">
        <MobileField label="Role">
          <SearchableSelect
            options={jobTypeNames.map(j => ({ id: j, label: j }))}
            value={assignment.role ?? null}
            onChange={(role) => {
              const dept = role ? getDepartmentForJob(role) : null;
              updateAssignment(assignment.id, { role, department: dept ?? undefined });
            }}
            placeholder="Search role..."
          />
        </MobileField>

        <MobileField label="Availability">
          <Select
            value={assignment.availability}
            onValueChange={(v) => updateAssignment(assignment.id, { availability: v as AssignmentStatusType })}
          >
            <SelectTrigger className={mobileInputCn}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AssignmentStatus).map(s => (
                <SelectItem key={s} value={s}>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${ASSIGNMENT_STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-600'}`}>
                    {s}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MobileField>

        <MobileField label="Rate / Notes">
          <Textarea
            value={assignment.notes ?? ''}
            onChange={(e) => updateAssignment(assignment.id, { notes: e.target.value || null })}
            className={mobileTextareaCn}
            placeholder="e.g. €500/day, flat fee…"
          />
        </MobileField>
      </div>
    </article>
  );
}

// ── summary card ───────────────────────────────────────────────

function ProjectSummaryCard({ project, clientOrg }: { project: Project; clientOrg: Organization | null }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{project.project_number}</span>
        <ProjectStatusBadge status={project.status} />
      </div>
      <dl className="space-y-1.5 text-sm">
        {(project.start_date || project.end_date) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dd>
              {formatDate(project.start_date)}
              {project.end_date ? ` – ${formatDate(project.end_date)}` : ''}
            </dd>
          </div>
        )}
        {(project.shooting_location || project.inquiry_country) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dd className="truncate">{project.shooting_location ?? project.inquiry_country}</dd>
          </div>
        )}
        {clientOrg && (
          <dd className="truncate text-muted-foreground">Client: {clientOrg.name}</dd>
        )}
      </dl>
    </div>
  );
}

// ── tab panels ─────────────────────────────────────────────────

function OverviewTab({ editedProject, updateField, organizations }: {
  editedProject: Project;
  updateField: <K extends keyof Project>(field: K, value: Project[K]) => void;
  organizations: Organization[];
}) {
  const [orgQuery, setOrgQuery] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const selectedOrg = organizations.find(o => o.id === editedProject.client_organization_id) ?? null;
  const filteredOrgs = organizations.filter(o => o.name.toLowerCase().includes(orgQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <MobileField label="Project Name">
        <Input
          value={editedProject.name}
          onChange={(e) => updateField('name', e.target.value)}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="Status">
        <Select
          value={editedProject.status}
          onValueChange={(v) => updateField('status', v as ProjectStatus)}
        >
          <SelectTrigger className={mobileInputCn}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ProjectStatus).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </MobileField>

      <MobileField label="Client Organization">
        {selectedOrg ? (
          <div className="flex h-11 items-center gap-2 rounded-xl border bg-muted/30 px-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{selectedOrg.name}</span>
            <button
              type="button"
              onClick={() => { updateField('client_organization_id', null); }}
              aria-label="Clear client organization"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              value={orgQuery}
              onChange={(e) => { setOrgQuery(e.target.value); setOrgOpen(true); }}
              onFocus={() => setOrgOpen(true)}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOrgOpen(false);
              }}
              placeholder="Search organization..."
              className={`${mobileInputCn} pl-9`}
            />
            {orgOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border bg-card shadow-lg">
                {filteredOrgs.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No organizations found</p>
                ) : filteredOrgs.map(org => (
                  <button
                    key={org.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { updateField('client_organization_id', org.id); setOrgQuery(''); setOrgOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </MobileField>

      <MobileField label="Schedule">
        <div className="rounded-xl border p-3">
          <InlineDateRangePicker
            startDate={editedProject.start_date ?? null}
            endDate={editedProject.end_date ?? null}
            onChangeStart={(v) => updateField('start_date', v)}
            onChangeEnd={(v) => updateField('end_date', v)}
          />
        </div>
      </MobileField>

      <MobileField label="Inquiry Country">
        <SearchableSelect
          options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
          value={editedProject.inquiry_country || null}
          onChange={(v) => updateField('inquiry_country', v)}
          placeholder="Search country..."
        />
      </MobileField>

      <MobileField label="Shooting Location">
        <Input
          value={editedProject.shooting_location || ''}
          onChange={(e) => updateField('shooting_location', e.target.value || null)}
          placeholder="e.g. Berlin"
          className={mobileInputCn}
        />
      </MobileField>
    </div>
  );
}

function CrewTab({ assignments, filteredAssignments, crewFilter, setCrewFilter, crewDeptFilter, setCrewDeptFilter,
  people, organizations, jobTypeNames, getDepartmentForJob, updateAssignment, deleteAssignment, onAddCrew, onAddOrg,
}: Pick<ProjectMobileDetailProps, 'assignments' | 'filteredAssignments' | 'crewFilter' | 'setCrewFilter' | 'crewDeptFilter' | 'setCrewDeptFilter' | 'people' | 'organizations' | 'jobTypeNames' | 'getDepartmentForJob' | 'updateAssignment' | 'deleteAssignment' | 'onAddCrew' | 'onAddOrg'>) {
  return (
    <div className="space-y-4">
      {/* Filters + add buttons */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            value={crewFilter}
            onChange={(e) => setCrewFilter(e.target.value)}
            placeholder="Filter crew..."
            className="pl-9 h-11 text-base rounded-xl"
          />
        </div>
        <Select value={crewDeptFilter} onValueChange={setCrewDeptFilter}>
          <SelectTrigger className="h-11 text-base rounded-xl">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {Object.values(CrewDepartment).map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={onAddCrew} className="flex-1 h-11 rounded-xl gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Crew
          </Button>
          <Button onClick={onAddOrg} variant="outline" className="flex-1 h-11 rounded-xl gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Org
          </Button>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <MobileEmptyState
          title={assignments.length === 0 ? 'No crew assigned' : 'No crew matches filter'}
          description={assignments.length === 0 ? 'Tap "Add Crew" to assign someone.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map(a => (
            <MobileCrewCard
              key={a.id}
              assignment={a}
              people={people}
              organizations={organizations}
              jobTypeNames={jobTypeNames}
              getDepartmentForJob={getDepartmentForJob}
              updateAssignment={updateAssignment}
              deleteAssignment={deleteAssignment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrganizationsTab({ editedProject, updateField, organizations }: {
  editedProject: Project;
  updateField: <K extends keyof Project>(field: K, value: Project[K]) => void;
  organizations: Organization[];
}) {
  const clientOrg = organizations.find(o => o.id === editedProject.client_organization_id) ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold">Client Organization</h3>
        {clientOrg ? (
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-sm truncate">{clientOrg.name}</span>
            <button
              type="button"
              onClick={() => updateField('client_organization_id', null)}
              aria-label="Remove client organization"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No client organization set. Set it in the Overview tab.</p>
        )}
      </div>
    </div>
  );
}

function NotesTab({ editedProject, updateField, project, onDelete }: {
  editedProject: Project;
  updateField: <K extends keyof Project>(field: K, value: Project[K]) => void;
  project: Project;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      <MobileField label="Notes">
        <Textarea
          value={editedProject.notes || ''}
          onChange={(e) => updateField('notes', e.target.value || null)}
          className={mobileTextareaCn}
          rows={5}
          placeholder="Project notes…"
        />
      </MobileField>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <EntryMetadata
          createdAt={project.creation_date}
          updatedAt={project.updated_at}
          userId={project.user_id}
        />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete Project
      </button>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────

export function ProjectMobileDetail({
  project, editedProject, updateField, onClose, onDelete,
  organizations, people, assignments, filteredAssignments,
  crewFilter, setCrewFilter, crewDeptFilter, setCrewDeptFilter,
  jobTypeNames, getDepartmentForJob,
  updateAssignment, deleteAssignment,
  onAddCrew, onAddOrg,
}: ProjectMobileDetailProps) {
  const clientOrg = organizations.find(o => o.id === editedProject.client_organization_id) ?? null;

  const tabs: MobileSwipeTab[] = [
    {
      value: 'overview',
      label: 'Overview',
      content: <OverviewTab editedProject={editedProject} updateField={updateField} organizations={organizations} />,
    },
    {
      value: 'crew',
      label: 'Crew',
      badge: assignments.length > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
          {assignments.length}
        </span>
      ) : undefined,
      content: (
        <CrewTab
          assignments={assignments}
          filteredAssignments={filteredAssignments}
          crewFilter={crewFilter}
          setCrewFilter={setCrewFilter}
          crewDeptFilter={crewDeptFilter}
          setCrewDeptFilter={setCrewDeptFilter}
          people={people}
          organizations={organizations}
          jobTypeNames={jobTypeNames}
          getDepartmentForJob={getDepartmentForJob}
          updateAssignment={updateAssignment}
          deleteAssignment={deleteAssignment}
          onAddCrew={onAddCrew}
          onAddOrg={onAddOrg}
        />
      ),
    },
    {
      value: 'organizations',
      label: 'Orgs',
      content: <OrganizationsTab editedProject={editedProject} updateField={updateField} organizations={organizations} />,
    },
    {
      value: 'notes',
      label: 'Notes',
      content: (
        <NotesTab
          editedProject={editedProject}
          updateField={updateField}
          project={project}
          onDelete={onDelete}
        />
      ),
    },
  ];

  return (
    <MobileEntityDetailLayout
      title={editedProject.name}
      subtitle={editedProject.project_number || undefined}
      onBack={onClose}
      rightAction={<ProjectStatusBadge status={editedProject.status} />}
      summary={<ProjectSummaryCard project={editedProject} clientOrg={clientOrg} />}
    >
      <MobileSwipeTabs tabs={tabs} defaultValue="overview" className="h-full" />
    </MobileEntityDetailLayout>
  );
}
