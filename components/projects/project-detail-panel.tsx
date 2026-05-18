'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { Project, Organization, Person } from '@/lib/types/models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InlineDateRangePicker } from '@/components/ui/date-range-picker';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectAssignmentsStore } from '@/lib/stores/project-assignments-store';
import { ProjectStatus, FILM_COUNTRIES, AssignmentStatus, CrewDepartment } from '@/lib/types/models';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { Trash2, Plus, ExternalLink, Search, ChevronLeft, Calendar, MapPin, ChevronUp, ChevronDown, ChevronsUpDown, Mail, Phone, Globe } from 'lucide-react';
import type { ProjectAssignment } from '@/lib/types/models';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AddCrewDialog } from './add-crew-dialog';
import { AddOrgToProjectDialog } from './add-org-to-project-dialog';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { OrganizationDetailDrawer, OrgDetailPane } from '@/components/organizations/organization-detail-drawer';
import { PersonDetailPane } from '@/components/people/person-detail-drawer';
import { format } from 'date-fns';
import { useIsMobile } from '@/lib/hooks/use-media-query';
import { ProjectMobileDetail } from './project-mobile-detail';
import { DetailFrame, DesktopDetailSnapCanvas, DetailSlide } from '@/components/detail';

interface ProjectDetailPanelProps {
  project: Project;
  onClose: () => void;
}

/**
 * Inline cell search popover used for editing role/department in the crew table.
 * Renders the dropdown via Radix Popover (portaled) so it isn't clipped by
 * the surrounding DetailFrame overflow.
 */
function InlineCellSearch({
  options,
  defaultValue,
  onCommit,
  onCancel,
  allowCustomValue,
}: {
  options: string[];
  defaultValue: string | null;
  onCommit: (value: string | null) => void;
  onCancel: () => void;
  allowCustomValue?: boolean;
}) {
  const [query, setQuery] = useState(defaultValue ?? '');
  const trimmed = query.trim();
  const filtered = trimmed
    ? options.filter(o => o.toLowerCase().includes(trimmed.toLowerCase()))
    : options;
  const hasExactMatch = trimmed
    ? options.some(o => o.toLowerCase() === trimmed.toLowerCase())
    : false;
  const canCommitCustom = !!allowCustomValue && trimmed.length > 0 && !hasExactMatch;

  return (
    <PopoverPrimitive.Root open onOpenChange={(next) => { if (!next) onCancel(); }}>
      <PopoverPrimitive.Anchor asChild>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={(e) => {
            // Don't cancel if focus moved into the popover content
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.closest('[data-radix-popper-content-wrapper]')) return;
            onCancel();
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
            if (e.key === 'Enter') {
              if (filtered.length === 1) {
                e.preventDefault();
                onCommit(filtered[0]);
              } else if (canCommitCustom) {
                e.preventDefault();
                onCommit(trimmed);
              }
            }
          }}
          placeholder="Search…"
          className="h-6 w-full rounded border border-blue-400 px-1.5 text-xs outline-none bg-white dark:bg-gray-900 dark:text-gray-100"
        />
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={2}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 min-w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto"
        >
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onCommit(null)}
            className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            — clear
          </button>
          {canCommitCustom && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onCommit(trimmed)}
              className="w-full text-left text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-300 border-b border-gray-100 dark:border-gray-800"
            >
              Use &ldquo;{trimmed}&rdquo; as custom
            </button>
          )}
          {filtered.length === 0 ? (
            !canCommitCustom && <div className="text-xs text-gray-400 px-2 py-1.5">No matches</div>
          ) : filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onCommit(opt)}
              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {opt}
            </button>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  INQUIRY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  BUDGET: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PRODUCTION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  COMPLETED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  HOLD: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  [ProjectStatus.Inquiry]: 'bg-blue-500',
  [ProjectStatus.Budget]: 'bg-orange-500',
  [ProjectStatus.Production]: 'bg-green-500',
  [ProjectStatus.Completed]: 'bg-teal-500',
  [ProjectStatus.Cancelled]: 'bg-red-500',
  [ProjectStatus.Hold]: 'bg-purple-500',
};

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return null;
  try { return format(new Date(dateString), 'MMM d, yyyy'); } catch { return null; }
}

function DesktopEditableTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); setDraft(value); setEditing(false); }
        }}
        className="w-full bg-transparent font-semibold text-[15px] outline-none border-b border-primary/60 focus:border-primary"
        aria-label="Project name"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className="block w-full truncate text-left font-semibold text-[15px] hover:text-primary transition-colors"
      data-cb-field="project-title"
    >
      {value}
    </button>
  );
}

function DesktopHeaderStatusDropdown({
  status, onChange,
}: { status: ProjectStatus; onChange: (s: ProjectStatus) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Status: ${status}. Click to change.`}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
          data-cb-field="project-status"
        >
          <Badge className={`text-xs px-2 py-0 cursor-pointer hover:opacity-90 ${STATUS_BADGE_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}>
            {status}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {Object.values(ProjectStatus).map((s) => (
          <DropdownMenuItem key={s} onClick={() => onChange(s as ProjectStatus)}>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[s] ?? 'bg-gray-500'}`} />
              {s}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientOrgCard({
  org, onView, onClear,
}: { org: Organization; onView: () => void; onClear: () => void }) {
  const invoiceName = org.name_invoice && org.name_invoice.trim() ? org.name_invoice : org.name;
  const hasInvoiceAddress = !!(org.street_invoice || org.street2_invoice || org.zip_invoice || org.city_invoice || org.country_invoice);
  const addrSource = hasInvoiceAddress
    ? { street: org.street_invoice, street2: org.street2_invoice, zip: org.zip_invoice, city: org.city_invoice, country: org.country_invoice }
    : { street: org.street, street2: org.street2, zip: org.zip, city: org.city, country: org.country };
  const addressLines = [
    addrSource.street,
    addrSource.street2,
    [addrSource.zip, addrSource.city].filter(Boolean).join(' '),
    addrSource.country,
  ].map(s => (s ?? '').trim()).filter(Boolean);
  const vatNumber = org.financial_details?.vat_number?.trim() || null;
  const hasContact = !!(org.contact_email || org.contact_phone || org.website);

  return (
    <div className="rounded-md border bg-card text-xs" data-cb-field="client-organization">
      <div className="flex items-start justify-between gap-2 px-2.5 py-2 border-b">
        <div className="min-w-0 font-semibold text-[13px] leading-tight truncate">{invoiceName}</div>
        <button
          type="button"
          onClick={onView}
          aria-label="View organization"
          className="shrink-0 inline-flex items-center gap-1 rounded px-1.5 h-6 text-[11px] font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          View
        </button>
      </div>
      <div className="px-2.5 py-2 space-y-1.5">
        {addressLines.length > 0 ? (
          <div className="text-muted-foreground leading-snug space-y-0.5">
            {addressLines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        ) : null}
        {hasContact ? (
          <div className="space-y-0.5 pt-1 border-t">
            {org.contact_email ? (
              <a href={`mailto:${org.contact_email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{org.contact_email}</span>
              </a>
            ) : null}
            {org.contact_phone ? (
              <a href={`tel:${org.contact_phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{org.contact_phone}</span>
              </a>
            ) : null}
            {org.website ? (
              <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{org.website}</span>
              </a>
            ) : null}
          </div>
        ) : null}
        {vatNumber ? (
          <div className="text-muted-foreground">VAT: {vatNumber}</div>
        ) : null}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove client organization"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPanel({ project, onClose }: ProjectDetailPanelProps) {
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [showAddCrewDialog, setShowAddCrewDialog] = useState(false);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [orgForDetail, setOrgForDetail] = useState<Organization | null>(null);
  const [mobileOrgForDetail, setMobileOrgForDetail] = useState<Organization | null>(null);
  const [mobilePersonForDetail, setMobilePersonForDetail] = useState<Person | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<string>('overview');
  const [crewFilter, setCrewFilter] = useState('');
  const [crewDeptFilter, setCrewDeptFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<'name' | 'role' | 'department' | 'availability' | 'rate'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ id: string; field: string } | null>(null);
  const lastProjectIdRef = useRef<string>(project.id);

  const _jobTypes = useJobTypesStore(s => s.jobTypes);
  const jobTypeNames = useMemo(() => _jobTypes.map(j => j.name), [_jobTypes]);
  const getDepartmentForJob = useJobTypesStore(s => s.getDepartmentForJob);

  const updateProject = useProjectsStore(state => state.updateProject);
  const deleteProject = useProjectsStore(state => state.deleteProject);
  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);
  const people = usePeopleStore(state => state.people);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const assignments = useProjectAssignmentsStore(state => state.assignments);
  const fetchAssignmentsByProject = useProjectAssignmentsStore(state => state.fetchAssignmentsByProject);
  const deleteAssignment = useProjectAssignmentsStore(state => state.deleteAssignment);
  const updateAssignment = useProjectAssignmentsStore(state => state.updateAssignment);

  const handleSortClick = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  useEffect(() => {
    if (lastProjectIdRef.current !== project.id) {
      lastProjectIdRef.current = project.id;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedProject(project);
    }
  }, [project]);

  useEffect(() => {
    fetchAssignmentsByProject(project.id);
    if (organizations.length === 0) fetchOrganizations();
    if (people.length === 0) fetchPeople();
  }, [project.id, fetchAssignmentsByProject, fetchOrganizations, organizations.length, fetchPeople, people.length]);

  // Auto-save with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(editedProject) !== JSON.stringify(project)) {
        updateProject(project.id, editedProject);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editedProject, project, updateProject]);

  const updateField = <K extends keyof Project>(field: K, value: Project[K]) => {
    setEditedProject(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete project ${project.name}?`)) {
      await deleteProject(project.id);
      onClose();
    }
  };

  const selectedOrg = organizations.find(o => o.id === editedProject.client_organization_id) ?? null;

  const handleOrgClear = () => {
    updateField('client_organization_id', null);
  };

  const getDisplayName = (a: ProjectAssignment) =>
    (a.person_id ? people.find(p => p.id === a.person_id)?.name : null) ??
    (a.organization_id ? organizations.find(o => o.id === a.organization_id)?.name : null) ??
    'Unknown';

  const filteredAssignments = assignments
    .filter(a => {
      const name = getDisplayName(a);
      const matchesName = name.toLowerCase().includes(crewFilter.toLowerCase()) ||
        (a.role ?? '').toLowerCase().includes(crewFilter.toLowerCase());
      const matchesDept = crewDeptFilter === 'all' || a.department === crewDeptFilter;
      return matchesName && matchesDept;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortCol === 'name') return getDisplayName(a).localeCompare(getDisplayName(b)) * dir;
      if (sortCol === 'role') return (a.role ?? '').localeCompare(b.role ?? '') * dir;
      if (sortCol === 'department') return (a.department ?? '').localeCompare(b.department ?? '') * dir;
      if (sortCol === 'availability') return a.availability.localeCompare(b.availability) * dir;
      if (sortCol === 'rate') return (a.notes ?? '').localeCompare(b.notes ?? '') * dir;
      return 0;
    });

  const handleCellClick = (id: string, field: string) => () => {
    if (focusedCell?.id === id && focusedCell?.field === field) {
      setEditingCell({ id, field });
      setFocusedCell(null);
    } else {
      setFocusedCell({ id, field });
      setEditingCell(null);
    }
  };

  const isMobile = useIsMobile();

  if (isMobile) {
    const handleViewPerson = (personId: string) => {
      const p = people.find(pp => pp.id === personId);
      if (p) {
        setMobileActiveTab('crew');
        setMobilePersonForDetail(p);
      }
    };
    const handleViewOrganization = (orgId: string) => {
      const o = organizations.find(oo => oo.id === orgId);
      if (o) {
        setMobileActiveTab('overview');
        setMobileOrgForDetail(o);
      }
    };

    return (
      <>
        <ProjectMobileDetail
          project={project}
          editedProject={editedProject}
          updateField={updateField}
          onClose={onClose}
          onDelete={handleDelete}
          organizations={organizations}
          people={people}
          assignments={assignments}
          filteredAssignments={filteredAssignments}
          crewFilter={crewFilter}
          setCrewFilter={setCrewFilter}
          crewDeptFilter={crewDeptFilter}
          setCrewDeptFilter={setCrewDeptFilter}
          jobTypeNames={jobTypeNames}
          getDepartmentForJob={getDepartmentForJob}
          updateAssignment={updateAssignment}
          deleteAssignment={deleteAssignment}
          onAddCrew={() => setShowAddCrewDialog(true)}
          onAddOrg={() => setShowAddOrgDialog(true)}
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
          onViewPerson={handleViewPerson}
          onViewOrganization={handleViewOrganization}
        />
        {mobilePersonForDetail && (
          <PersonDetailPane
            person={mobilePersonForDetail}
            onClose={() => setMobilePersonForDetail(null)}
          />
        )}
        {mobileOrgForDetail && (
          <OrgDetailPane
            organization={mobileOrgForDetail}
            onClose={() => setMobileOrgForDetail(null)}
          />
        )}
        <AddCrewDialog
          projectId={project.id}
          open={showAddCrewDialog}
          onOpenChange={setShowAddCrewDialog}
        />
        <AddOrgToProjectDialog
          projectId={project.id}
          open={showAddOrgDialog}
          onOpenChange={setShowAddOrgDialog}
        />
      </>
    );
  }

  const statusBadge = (status: AssignmentStatus) => {
    const cls =
      status === AssignmentStatus.Verfuegbar ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
      status === AssignmentStatus.Angefragt  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
      status === AssignmentStatus.Gebucht    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
      status === AssignmentStatus.ErsteOption ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{status}</span>;
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0 bg-background" data-cb-component="ProjectDetailPanel">

        {/* ── DETAIL HEADER ── */}
        <div className="shrink-0 border-b bg-card px-4 py-1.5 flex items-center gap-3" data-cb-area="Header">
          <button
            onClick={onClose}
            aria-label="Back to list"
            className="flex items-center gap-1 group text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <DesktopEditableTitle
                value={editedProject.name}
                onChange={(v) => updateField('name', v)}
              />
              <div className="flex items-center gap-3 mt-0.5 text-[12px] text-muted-foreground">
                <span>{editedProject.project_number}</span>
                {editedProject.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(editedProject.start_date)}</span>}
                {editedProject.shooting_location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{editedProject.shooting_location}</span>}
              </div>
            </div>
            <DesktopHeaderStatusDropdown
              status={editedProject.status}
              onChange={(s) => updateField('status', s)}
            />
          </div>
        </div>

        {/* ── HORIZONTAL SLIDE CANVAS — each slide holds 1–2 frames ── */}
        <DesktopDetailSnapCanvas ariaLabel="Project detail slides">

          <DetailSlide ariaLabel="Project basics and schedule" tabLabel="Basics">
            <DetailFrame title="Basic Information" className="flex-1" data-cb-area="BasicInfo">
              <div className="space-y-2 detail-form-fields">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">Project Number</Label>
                  <Input value={editedProject.project_number || ''} disabled className="h-7 text-xs font-mono" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">Project Name</Label>
                  <Input value={editedProject.name} onChange={(e) => updateField('name', e.target.value)} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">Status</Label>
                  <Select value={editedProject.status} onValueChange={(v) => updateField('status', v as ProjectStatus)}>
                    <SelectTrigger size="xs" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(ProjectStatus).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DetailFrame>

            <DetailFrame title="Schedule" className="flex-1" data-cb-area="Schedule">
              <div className="detail-form-fields">
                <InlineDateRangePicker
                  startDate={editedProject.start_date ?? null}
                  endDate={editedProject.end_date ?? null}
                  onChangeStart={(v) => updateField('start_date', v)}
                  onChangeEnd={(v) => updateField('end_date', v)}
                />
              </div>
            </DetailFrame>
          </DetailSlide>

          <DetailSlide ariaLabel="Project crew" tabLabel="Crew">
            <DetailFrame
              title="Crew"
              description={assignments.length > 0 ? `${assignments.length} crew member${assignments.length === 1 ? '' : 's'}` : undefined}
              className="flex-1"
              data-cb-area="CrewSection"
              action={
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setShowAddOrgDialog(true)} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Organisation
                  </Button>
                  <Button size="sm" onClick={() => setShowAddCrewDialog(true)} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Crew
                  </Button>
                </div>
              }
            >
              {/* Filters sub-toolbar */}
              <div className="flex items-center gap-2 pb-2 border-b mb-2">
                <div className="relative flex-1 max-w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                  <Input
                    value={crewFilter}
                    onChange={(e) => setCrewFilter(e.target.value)}
                    placeholder="Filter crew..."
                    className="h-7 text-xs pl-6"
                  />
                </div>
                <Select value={crewDeptFilter} onValueChange={setCrewDeptFilter}>
                  <SelectTrigger size="xs" className="w-36">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {Object.values(CrewDepartment).map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredAssignments.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  {assignments.length === 0 ? 'No crew assigned yet. Click "Add Crew" to start.' : 'No crew matches the current filter.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {/* Sortable header */}
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-2 px-2 py-1 border-b sticky top-0 bg-card z-10">
                    {([
                      ['name', 'Name'],
                      ['role', 'Role'],
                      ['department', 'Dept'],
                      ['availability', 'Status'],
                      ['rate', 'Rate / Notes'],
                    ] as const).map(([col, label]) => (
                      <button
                        key={col}
                        onClick={() => handleSortClick(col)}
                        className="flex items-center gap-0.5 text-[10px] font-semibold uppercase text-gray-400 hover:text-gray-600 transition-colors text-left"
                      >
                        {label}
                        {sortCol === col
                          ? sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                    ))}
                    <div />
                  </div>

                  {filteredAssignments.map((assignment) => {
                    const displayName = getDisplayName(assignment);
                    const isOrg = !!assignment.organization_id && !assignment.person_id;
                    const ec = editingCell;
                    const isEditingRole = ec?.id === assignment.id && ec?.field === 'role';
                    const isEditingDept = ec?.id === assignment.id && ec?.field === 'department';
                    const isEditingNotes = ec?.id === assignment.id && ec?.field === 'notes';
                    const isFocusedRole = focusedCell?.id === assignment.id && focusedCell?.field === 'role';
                    const isFocusedDept = focusedCell?.id === assignment.id && focusedCell?.field === 'department';
                    const isFocusedNotes = focusedCell?.id === assignment.id && focusedCell?.field === 'notes';

                    return (
                      <div key={assignment.id} className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-2 px-2 py-1.5 border rounded text-xs items-start hover:bg-gray-50 dark:hover:bg-gray-800">
                        {/* Name */}
                        <div className="font-medium truncate">
                          {displayName}
                          {isOrg && <span className="ml-1 text-[10px] text-gray-400 font-normal">org</span>}
                        </div>

                        {/* Role */}
                        {isEditingRole ? (
                          <InlineCellSearch
                            options={jobTypeNames}
                            defaultValue={assignment.role ?? null}
                            allowCustomValue
                            onCommit={(v) => {
                              const role = v ?? null;
                              const dept = role ? getDepartmentForJob(role) : null;
                              updateAssignment(assignment.id, { role, department: dept ?? undefined });
                              setEditingCell(null);
                            }}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <div
                            onClick={handleCellClick(assignment.id, 'role')}
                            className={`truncate cursor-pointer rounded px-1 -mx-1 py-0.5 transition-colors ${isFocusedRole ? 'ring-1 ring-blue-400 bg-blue-50 dark:bg-blue-950' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            {assignment.role || <span className="text-gray-400">—</span>}
                          </div>
                        )}

                        {/* Department */}
                        {isEditingDept ? (
                          <InlineCellSearch
                            options={Object.values(CrewDepartment)}
                            defaultValue={assignment.department ?? null}
                            onCommit={(v) => {
                              updateAssignment(assignment.id, { department: v as CrewDepartment | null });
                              setEditingCell(null);
                            }}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <div
                            onClick={handleCellClick(assignment.id, 'department')}
                            className={`truncate cursor-pointer rounded px-1 -mx-1 py-0.5 transition-colors ${isFocusedDept ? 'ring-1 ring-blue-400 bg-blue-50 dark:bg-blue-950' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            {assignment.department || <span className="text-gray-400">—</span>}
                          </div>
                        )}

                        {/* Status — DropdownMenu portals out of the frame overflow. */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-left cursor-pointer rounded px-1 -mx-1 py-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 focus-visible:bg-blue-50 dark:focus-visible:bg-blue-950"
                              aria-label={`Status: ${assignment.availability}. Click to change.`}
                            >
                              {statusBadge(assignment.availability)}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-40">
                            {Object.values(AssignmentStatus).map(s => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => updateAssignment(assignment.id, { availability: s })}
                              >
                                {statusBadge(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Rate / Notes */}
                        {isEditingNotes ? (
                          <Textarea
                            autoFocus
                            defaultValue={assignment.notes || ''}
                            onBlur={(e) => { updateAssignment(assignment.id, { notes: e.target.value || null }); setEditingCell(null); }}
                            rows={2}
                            className="text-xs resize-none w-full"
                            placeholder="e.g. €500/day, flat fee…"
                          />
                        ) : (
                          <div
                            onClick={handleCellClick(assignment.id, 'notes')}
                            className={`text-gray-500 cursor-pointer line-clamp-2 rounded px-1 -mx-1 py-0.5 transition-colors ${isFocusedNotes ? 'ring-1 ring-blue-400 bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            {assignment.notes || (assignment.daily_pay ? `${assignment.currency} ${assignment.daily_pay}` : <span className="text-gray-400">—</span>)}
                          </div>
                        )}

                        {/* Delete */}
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={async () => { if (confirm(`Remove ${displayName} from this project?`)) await deleteAssignment(assignment.id); }} className="h-6 w-6 p-0 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DetailFrame>

          </DetailSlide>

          <DetailSlide ariaLabel="Project location and client" tabLabel="Location">
            <DetailFrame title="Location" className="flex-1" data-cb-area="Location">
              <div className="space-y-2 detail-form-fields">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">Inquiry Country</Label>
                  <SearchableSelect
                    options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty
                    value={editedProject.inquiry_country || null}
                    onChange={(v) => updateField('inquiry_country', v)}
                    placeholder="Search country..."
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">Shooting Location</Label>
                  <Input
                    value={editedProject.shooting_location || ''}
                    onChange={(e) => updateField('shooting_location', e.target.value || null)}
                    placeholder="e.g. Berlin"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </DetailFrame>

            <DetailFrame title="Client / Organization" className="flex-1" data-cb-area="ClientOrg">
              {selectedOrg ? (
                <ClientOrgCard
                  org={selectedOrg}
                  onView={() => setOrgForDetail(selectedOrg)}
                  onClear={() => {
                    if (confirm('Remove client organization from this project?')) handleOrgClear();
                  }}
                />
              ) : (
                <div className="space-y-2">
                  <Label className="text-[10px] text-gray-500">Link client organization</Label>
                  <SearchableSelect
                    options={organizations.map(o => ({ id: o.id, label: o.name, sublabel: o.jobs?.[0] }))}
                    value={null}
                    onChange={(id) => { if (id) updateField('client_organization_id', id); }}
                    placeholder="Search organization..."
                  />
                </div>
              )}
            </DetailFrame>


          </DetailSlide>

          <DetailSlide ariaLabel="Project notes and metadata" tabLabel="Notes">
            <DetailFrame title="Notes" className="flex-1" data-cb-area="Notes">
              <div className="flex h-full flex-col detail-form-fields">
                <Textarea
                  value={editedProject.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value || null)}
                  placeholder="Project notes..."
                  className="flex-1 text-xs resize-none min-h-20"
                />
              </div>
            </DetailFrame>

            <DetailFrame
              title="Metadata"
              className="flex-1"
              data-cb-area="Metadata"
              action={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDelete}
                  className="h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                  aria-label="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              }
            >
              <EntryMetadata
                createdAt={project.creation_date}
                updatedAt={project.updated_at}
                userId={project.user_id}
              />
            </DetailFrame>
          </DetailSlide>

        </DesktopDetailSnapCanvas>

      </div>

      <AddCrewDialog
        projectId={project.id}
        open={showAddCrewDialog}
        onOpenChange={setShowAddCrewDialog}
      />

      <AddOrgToProjectDialog
        projectId={project.id}
        open={showAddOrgDialog}
        onOpenChange={setShowAddOrgDialog}
      />

      {orgForDetail && (
        <OrganizationDetailDrawer
          organization={orgForDetail}
          open={!!orgForDetail}
          onOpenChange={(v) => { if (!v) setOrgForDetail(null); }}
        />
      )}
    </>
  );
}
