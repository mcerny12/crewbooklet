'use client';

import type { Project, Organization, ProjectAssignment, AssignmentStatus as AssignmentStatusType } from '@/lib/types/models';
import { AssignmentStatus, CrewDepartment, FILM_COUNTRIES } from '@/lib/types/models';
import { MobileEntityDetailLayout } from '@/components/mobile/mobile-entity-detail-layout';
import { MobileSwipeTabs } from '@/components/mobile/mobile-swipe-tabs';
import type { MobileSwipeTab } from '@/components/mobile/mobile-swipe-tabs';
import { MobileField, mobileInputCn, mobileTextareaCn } from '@/components/mobile/mobile-field';
import { MobileEmptyState } from '@/components/mobile/mobile-empty-state';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { InlineDateRangePicker } from '@/components/ui/date-range-picker';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { ChevronDown, Mail, Phone, Trash2, Plus, X, Search, CalendarDays, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

// ── types ──────────────────────────────────────────────────────

export type ProjectMobileDetailProps = {
  project: Project;
  editedProject: Project;
  updateField: <K extends keyof Project>(field: K, value: Project[K]) => void;
  onClose: () => void;
  onDelete: () => void;
  organizations: Organization[];
  people: { id: string; name: string; email?: string | null; mobile_phone?: string | null }[];
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
  people: { id: string; name: string; email?: string | null; mobile_phone?: string | null }[];
  organizations: Organization[];
  jobTypeNames: string[];
  getDepartmentForJob: (name: string) => CrewDepartment | null;
  updateAssignment: (id: string, updates: Partial<ProjectAssignment>) => void;
  deleteAssignment: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayName = getDisplayName(assignment, people, organizations);
  const person = assignment.person_id ? people.find(p => p.id === assignment.person_id) ?? null : null;
  const email = person?.email ?? null;
  const phone = person?.mobile_phone ?? null;

  // Build role options including any custom value already stored
  const roleOptions = useMemo(() => {
    const opts = jobTypeNames.map(j => ({ id: j, label: j }));
    const currentRole = assignment.role;
    if (currentRole && !jobTypeNames.includes(currentRole)) {
      opts.unshift({ id: currentRole, label: currentRole });
    }
    return opts;
  }, [jobTypeNames, assignment.role]);

  return (
    <article className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Collapsed header — always visible */}
      <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
              {assignment.role ?? '—'}
              {assignment.department ? ` · ${assignment.department}` : ''}
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${ASSIGNMENT_STATUS_COLORS[assignment.availability] ?? 'bg-gray-100 text-gray-600'}`}>
            {assignment.availability}
          </span>
        </button>

        {/* Contact icons */}
        <div className="flex shrink-0 items-center gap-0.5">
          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={e => e.stopPropagation()}
              aria-label={`Call ${displayName}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              onClick={e => e.stopPropagation()}
              aria-label={`Email ${displayName}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          <MobileField label="Role">
            <SearchableSelect
              options={roleOptions}
              value={assignment.role ?? null}
              onChange={(role) => {
                const dept = role ? getDepartmentForJob(role) : null;
                updateAssignment(assignment.id, { role, department: dept ?? undefined });
              }}
              placeholder="Search role…"
              className="h-9 text-sm"
            />
          </MobileField>

          <MobileField label="Availability">
            <Select
              value={assignment.availability}
              onValueChange={(v) => updateAssignment(assignment.id, { availability: v as AssignmentStatusType })}
            >
              <SelectTrigger className="h-9 min-h-9 rounded-lg px-2.5 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(AssignmentStatus).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MobileField>

          <MobileField label="Rate / Notes">
            <Textarea
              value={assignment.notes ?? ''}
              onChange={(e) => updateAssignment(assignment.id, { notes: e.target.value || null })}
              className="min-h-17 rounded-lg px-2.5 py-2 text-sm leading-snug resize-y"
              placeholder="e.g. €500/day, flat fee…"
            />
          </MobileField>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              aria-label={`Remove ${displayName} from project`}
              onClick={async () => {
                if (confirm(`Remove ${displayName} from this project?`)) await deleteAssignment(assignment.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-destructive/30 bg-destructive/5 text-xs font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ── summary card ───────────────────────────────────────────────

function ProjectSummaryCard({ project, clientOrg }: { project: Project; clientOrg: Organization | null }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-2.5 shadow-sm space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{project.project_number}</span>
        <ProjectStatusBadge status={project.status} />
      </div>
      <dl className="space-y-1 text-xs">
        {(project.start_date || project.end_date) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dd>
              {formatDate(project.start_date)}
              {project.end_date ? ` – ${formatDate(project.end_date)}` : ''}
            </dd>
          </div>
        )}
        {(project.shooting_location || project.inquiry_country) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
