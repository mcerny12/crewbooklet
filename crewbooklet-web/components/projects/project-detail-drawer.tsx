'use client';

import { useState, useEffect, useRef } from 'react';
import type { Project, Organization } from '@/lib/types/models';
import { BottomDrawer } from '@/components/ui/bottom-drawer';
import { DetailTabs } from '@/components/ui/detail-tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InlineDateRangePicker } from '@/components/ui/date-range-picker';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectAssignmentsStore } from '@/lib/stores/project-assignments-store';
import { ProjectStatus, FILM_COUNTRIES } from '@/lib/types/models';
import { FileText, Users, Banknote, Trash2, Plus, ExternalLink, X, Search } from 'lucide-react';
import { AddCrewDialog } from './add-crew-dialog';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { OrganizationDetailDrawer } from '@/components/organizations/organization-detail-drawer';

interface ProjectDetailDrawerProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDetailDrawer({ project, open, onOpenChange }: ProjectDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('information');
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [showAddCrewDialog, setShowAddCrewDialog] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [orgForDetail, setOrgForDetail] = useState<Organization | null>(null);
  const lastProjectIdRef = useRef<string>(project.id);

  const updateProject = useProjectsStore(state => state.updateProject);
  const deleteProject = useProjectsStore(state => state.deleteProject);
  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);
  const people = usePeopleStore(state => state.people);
  const assignments = useProjectAssignmentsStore(state => state.assignments);
  const fetchAssignmentsByProject = useProjectAssignmentsStore(state => state.fetchAssignmentsByProject);
  const deleteAssignment = useProjectAssignmentsStore(state => state.deleteAssignment);

  // Only reset form when switching to a different project
  useEffect(() => {
    if (lastProjectIdRef.current !== project.id) {
      lastProjectIdRef.current = project.id;
      setEditedProject(project);
      setOrgSearchQuery('');
    }
  }, [project]);

  useEffect(() => {
    if (open) {
      fetchAssignmentsByProject(project.id);
      if (organizations.length === 0) fetchOrganizations();
    }
  }, [open, project.id, fetchAssignmentsByProject, fetchOrganizations, organizations.length]);

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
      onOpenChange(false);
    }
  };

  // Org search helpers
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

  const tabs = [
    { id: 'information', label: 'Information', icon: <FileText className="h-4 w-4" /> },
    { id: 'crew', label: 'Crew', icon: <Users className="h-4 w-4" /> },
    { id: 'financial', label: 'Financial', icon: <Banknote className="h-4 w-4" /> },
  ];

  const getStatusColor = (status: ProjectStatus) => {
    const colors = {
      [ProjectStatus.Inquiry]: 'bg-blue-500',
      [ProjectStatus.Budget]: 'bg-orange-500',
      [ProjectStatus.Production]: 'bg-green-500',
      [ProjectStatus.Completed]: 'bg-teal-500',
      [ProjectStatus.Cancelled]: 'bg-red-500',
      [ProjectStatus.Hold]: 'bg-purple-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <>
      <BottomDrawer open={open} onOpenChange={onOpenChange}>
        <DetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-2 flex-1 overflow-y-auto">

            {/* ── INFORMATION TAB ── */}
            {activeTab === 'information' && (
              <div className="grid grid-cols-2 gap-3">

                {/* Column 1: Fields */}
                <div className="space-y-1">
                  <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5 mb-1">Basic Information</h3>

                  {/* Project Number + Name side by side */}
                  <div className="grid grid-cols-[100px_1fr] gap-1.5">
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
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(s)}`} />
                              {s}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Organization — searchable */}
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium text-gray-500">Client Organization</Label>
                    {selectedOrg ? (
                      <div className="flex items-center gap-1 h-7 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
                        <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{selectedOrg.name}</span>
                        <button
                          type="button"
                          onClick={() => setOrgForDetail(selectedOrg)}
                          className="text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                          title="Open organization detail"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleOrgClear}
                          className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                          title="Clear"
                        >
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
                          onBlur={(e) => {
                            if (!(e.currentTarget.parentElement?.contains(e.relatedTarget as Node))) {
                              setOrgDropdownOpen(false);
                            }
                          }}
                          placeholder="Search organization..."
                          className="h-7 text-xs pl-6"
                        />
                        {orgDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredOrgs.length === 0 ? (
                              <div className="text-xs text-gray-400 px-2 py-1.5">No organizations found</div>
                            ) : filteredOrgs.map((org) => (
                              <button
                                key={org.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleOrgSelect(org)}
                                className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                {org.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inquiry Country + Shooting Location side by side */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-medium text-gray-500">Inquiry Country</Label>
                      <Select
                        value={editedProject.inquiry_country || 'none'}
                        onValueChange={(value) => updateField('inquiry_country', value === 'none' ? null : value)}
                      >
                        <SelectTrigger size="xs" className="w-full">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {FILM_COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                {/* Column 2: Calendar + Notes */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5 mb-2">Schedule</h3>
                    <InlineDateRangePicker
                      startDate={editedProject.start_date ?? null}
                      endDate={editedProject.end_date ?? null}
                      onChangeStart={(v) => updateField('start_date', v)}
                      onChangeEnd={(v) => updateField('end_date', v)}
                    />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase text-gray-500 border-b pb-0.5 mb-1">Notes</h3>
                    <Textarea
                      value={editedProject.notes || ''}
                      onChange={(e) => updateField('notes', e.target.value || null)}
                      rows={8}
                      placeholder="Project notes..."
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── CREW TAB ── */}
            {activeTab === 'crew' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="text-xs font-semibold uppercase text-gray-500">Crew Members</h3>
                  <Button size="sm" onClick={() => setShowAddCrewDialog(true)} className="h-6 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Crew
                  </Button>
                </div>
                {assignments.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">No crew assigned yet. Click "Add Crew" to start.</p>
                ) : (
                  <div className="space-y-1">
                    {assignments.map((assignment) => {
                      const person = people.find(p => p.id === assignment.person_id);
                      if (!person) return null;
                      return (
                        <div key={assignment.id} className="p-1.5 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{person.name}</div>
                            <div className="text-gray-500 flex items-center gap-2">
                              {assignment.role && <span>{assignment.role}</span>}
                              {assignment.department && <span>• {assignment.department}</span>}
                              <span className="font-medium">• {assignment.availability}</span>
                              {assignment.daily_pay && (
                                <span>• {assignment.currency} {assignment.daily_pay}/day</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Remove ${person.name} from this project?`)) {
                                await deleteAssignment(assignment.id);
                              }
                            }}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── FINANCIAL TAB ── */}
            {activeTab === 'financial' && (
              <div className="max-w-2xl space-y-3">
                <h3 className="text-xs font-semibold uppercase text-gray-500 border-b pb-1">Budget & Financial</h3>
                <p className="text-sm text-gray-500">Financial management coming soon...</p>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="border-t bg-gray-50 dark:bg-gray-900 p-1.5 flex items-center justify-between">
            <EntryMetadata
              createdAt={project.creation_date}
              updatedAt={project.updated_at}
              userId={project.user_id}
            />
            {activeTab === 'information' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete Project"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <AddCrewDialog
          projectId={project.id}
          open={showAddCrewDialog}
          onOpenChange={setShowAddCrewDialog}
        />
      </BottomDrawer>

      {/* Organization detail — opened by clicking the external link icon */}
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
