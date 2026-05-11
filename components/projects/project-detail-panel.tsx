'use client';

import { useState, useEffect, useRef } from 'react';
import type { Project, Organization } from '@/lib/types/models';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InlineDateRangePicker } from '@/components/ui/date-range-picker';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectAssignmentsStore } from '@/lib/stores/project-assignments-store';
import { ProjectStatus, FILM_COUNTRIES, AssignmentStatus, CrewDepartment } from '@/lib/types/models';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { Trash2, Plus, ExternalLink, X, Search, ChevronLeft, Calendar, MapPin, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { ProjectAssignment } from '@/lib/types/models';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AddCrewDialog } from './add-crew-dialog';
import { AddOrgToProjectDialog } from './add-org-to-project-dialog';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { OrganizationDetailDrawer } from '@/components/organizations/organization-detail-drawer';
import { format } from 'date-fns';

interface ProjectDetailPanelProps {
  project: Project;
  onClose: () => void;
}

function InlineCellSearch({
  options,
  defaultValue,
  onCommit,
  onCancel,
}: {
  options: string[];
  defaultValue: string | null;
  onCommit: (value: string | null) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(defaultValue ?? '');
  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative">
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        onBlur={onCancel}
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          if (e.key === 'Enter' && filtered.length === 1) onCommit(filtered[0]);
        }}
        placeholder="Search…"
        className="h-6 w-full rounded border border-blue-400 px-1.5 text-xs outline-none bg-white dark:bg-gray-900 dark:text-gray-100"
      />
      <div className="absolute top-full left-0 z-60 min-w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onCommit(null)}
          className="w-full text-left text-xs px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
        >
          — clear
        </button>
        {filtered.length === 0 ? (
          <div className="text-xs text-gray-400 px-2 py-1.5">No matches</div>
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
      </div>
    </div>
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

export function ProjectDetailPanel({ project, onClose }: ProjectDetailPanelProps) {
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [showAddCrewDialog, setShowAddCrewDialog] = useState(false);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [orgForDetail, setOrgForDetail] = useState<Organization | null>(null);
  const [crewFilter, setCrewFilter] = useState('');
  const [crewDeptFilter, setCrewDeptFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<'name' | 'role' | 'department' | 'availability' | 'rate'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ id: string; field: string } | null>(null);
  const lastProjectIdRef = useRef<string>(project.id);

  const jobTypeNames = useJobTypesStore(s => s.jobTypeNames);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrgSearchQuery('');
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
  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(orgSearchQuery.toLowerCase())
  );

  const handleOrgSelect = (org: Organization) => {
    updateField('client_organization_id', org.id);
    setOrgSearchQuery('');
    setOrgDropdownOpen(false);
  };

  const handleOrgClear = () => {
    updateField('client_organization_id', null);
    setOrgSearchQuery('');
  };

  const getDisplayName = (a: typeof assignments[0]) =>
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

  return (
    <>
      <div className="flex flex-col h-full">

        {/* ── COLUMN HEADER ROW — identical to list view ── */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b sticky top-0 z-10">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Name & Number</div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Status</div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Start Date</div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Location</div>
        </div>

        {/* ── TITLE ROW — styled like a list item, clickable to go back ── */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-3 px-4 py-2 border-b items-center bg-white dark:bg-gray-950">
          {/* Name + Number — clickable back */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 min-w-0 text-left group"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors" />
            <div className="min-w-0">
              <div className="font-semibold truncate text-base group-hover:text-blue-600 transition-colors">
                {editedProject.name}
              </div>
              <div className="text-xs text-gray-500 truncate">{editedProject.project_number}</div>
            </div>
          </button>

          {/* Status */}
          <div>
            <Badge className={`text-xs px-2 py-0 ${STATUS_BADGE_COLORS[editedProject.status] ?? 'bg-gray-100 text-gray-800'}`}>
              {editedProject.status}
            </Badge>
          </div>

          {/* Dates */}
          <div className="min-w-0">
            {editedProject.start_date ? (
              <div className="flex items-center gap-1 truncate">
                <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="truncate text-xs">{formatDate(editedProject.start_date)}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>

          {/* Location */}
          <div className="min-w-0">
            {editedProject.shooting_location ? (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="truncate text-xs">{editedProject.shooting_location}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </div>
        </div>

        {/* ── PROJECT INFO ── */}
        <div className="border-b px-4 py-3 grid grid-cols-2 gap-4 shrink-0">

          {/* Column 1 */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5">Basic Information</h3>

            {/* Number + Name */}
            <div className="grid grid-cols-[90px_1fr] gap-1.5">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-medium text-gray-500">Number</Label>
                <div className="h-7 flex items-center px-2 text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded select-all">
                  {editedProject.project_number}
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-medium text-gray-500">Project Name</Label>
                <Input
                  value={editedProject.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium text-gray-500">Status</Label>
              <Select
                value={editedProject.status}
                onValueChange={(value) => updateField('status', value as ProjectStatus)}
              >
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProjectStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[s] ?? 'bg-gray-500'}`} />
                        {s}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Organization */}
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium text-gray-500">Client Organization</Label>
              {selectedOrg ? (
                <div className="flex items-center gap-1 h-7 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
                  <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{selectedOrg.name}</span>
                  <button type="button" onClick={() => setOrgForDetail(selectedOrg)} className="text-gray-400 hover:text-blue-600 transition-colors shrink-0" title="Open organization detail">
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={handleOrgClear} className="text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Clear">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none z-10" />
                  <Input
                    value={orgSearchQuery}
                    onChange={(e) => { setOrgSearchQuery(e.target.value); setOrgDropdownOpen(true); }}
                    onFocus={() => setOrgDropdownOpen(true)}
                    onBlur={(e) => { if (!(e.currentTarget.parentElement?.contains(e.relatedTarget as Node))) setOrgDropdownOpen(false); }}
                    placeholder="Search organization..."
                    className="h-7 text-xs pl-6"
                  />
                  {orgDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredOrgs.length === 0 ? (
                        <div className="text-xs text-gray-400 px-2 py-1.5">No organizations found</div>
                      ) : filteredOrgs.map((org) => (
                        <button key={org.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleOrgSelect(org)} className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          {org.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Country + Location */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-medium text-gray-500">Inquiry Country</Label>
                <SearchableSelect
                  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
                  value={editedProject.inquiry_country || null}
                  onChange={(v) => updateField('inquiry_country', v)}
                  placeholder="Search country..."
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-medium text-gray-500">Shooting Location</Label>
                <Input
                  value={editedProject.shooting_location || ''}
                  onChange={(e) => updateField('shooting_location', e.target.value || null)}
                  placeholder="e.g. Berlin"
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Schedule + Notes */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5">Schedule</h3>
            <InlineDateRangePicker
              startDate={editedProject.start_date ?? null}
              endDate={editedProject.end_date ?? null}
              onChangeStart={(v) => updateField('start_date', v)}
              onChangeEnd={(v) => updateField('end_date', v)}
            />
            <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5 pt-1">Notes</h3>
            <Textarea
              value={editedProject.notes || ''}
              onChange={(e) => updateField('notes', e.target.value || null)}
              rows={5}
              placeholder="Project notes..."
              className="text-xs resize-none"
            />
          </div>
        </div>

        {/* ── CREW SECTION — flex-1, independently scrollable ── */}
        <div className="flex flex-col flex-1 min-h-0">

          {/* Crew header + filters */}
          <div className="px-4 py-2 border-b flex items-center gap-2 shrink-0 bg-white dark:bg-gray-950">
            <span className="text-xs font-semibold uppercase text-gray-500 mr-1">Crew</span>

            {/* Name / role filter */}
            <div className="relative flex-1 max-w-48">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              <Input
                value={crewFilter}
                onChange={(e) => setCrewFilter(e.target.value)}
                placeholder="Filter crew..."
                className="h-7 text-xs pl-6"
              />
            </div>

            {/* Department filter */}
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

            <div className="ml-auto flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setShowAddOrgDialog(true)} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Organisation
              </Button>
              <Button size="sm" onClick={() => setShowAddCrewDialog(true)} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Crew
              </Button>
            </div>
          </div>

          {/* Crew list — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {filteredAssignments.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                {assignments.length === 0 ? 'No crew assigned yet. Click "Add Crew" to start.' : 'No crew matches the current filter.'}
              </p>
            ) : (
              <div className="space-y-1">
                {/* Sortable header */}
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-2 px-2 py-1 border-b">
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
                  const isEditingStatus = ec?.id === assignment.id && ec?.field === 'availability';
                  const isEditingNotes = ec?.id === assignment.id && ec?.field === 'notes';
                  const isFocusedRole = focusedCell?.id === assignment.id && focusedCell?.field === 'role';
                  const isFocusedDept = focusedCell?.id === assignment.id && focusedCell?.field === 'department';
                  const isFocusedStatus = focusedCell?.id === assignment.id && focusedCell?.field === 'availability';
                  const isFocusedNotes = focusedCell?.id === assignment.id && focusedCell?.field === 'notes';

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
                    <div key={assignment.id} className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-2 px-2 py-1.5 border rounded text-xs items-start hover:bg-gray-50 dark:hover:bg-gray-800">
                      {/* Name */}
                      <div className="font-medium truncate">
                        {displayName}
                        {isOrg && <span className="ml-1 text-[10px] text-gray-400 font-normal">org</span>}
                      </div>

                      {/* Role — click to select, click again to edit */}
                      {isEditingRole ? (
                        <InlineCellSearch
                          options={jobTypeNames}
                          defaultValue={assignment.role ?? null}
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

                      {/* Department — click to select, click again to edit */}
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

                      {/* Status — click to select, click again to open floating dropdown */}
                      <div className="relative">
                        <div
                          onClick={handleCellClick(assignment.id, 'availability')}
                          className={`cursor-pointer rounded px-1 -mx-1 py-0.5 transition-colors ${isFocusedStatus ? 'ring-1 ring-blue-400 bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {statusBadge(assignment.availability)}
                        </div>
                        {isEditingStatus && (
                          <div
                            className="absolute top-full left-0 z-60 min-w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-0.5"
                            onMouseDown={e => e.preventDefault()}
                          >
                            {Object.values(AssignmentStatus).map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => { updateAssignment(assignment.id, { availability: s }); setEditingCell(null); setFocusedCell(null); }}
                                className="w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                {statusBadge(s)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rate / Notes — click to select, click again to edit */}
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
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="border-t bg-gray-50 dark:bg-gray-900 px-4 py-1.5 flex items-center justify-between shrink-0">
          <EntryMetadata
            createdAt={project.creation_date}
            updatedAt={project.updated_at}
            userId={project.user_id}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            title="Delete Project"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
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
