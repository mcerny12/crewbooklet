'use client';

import { useState, useEffect, useRef } from 'react';
import type { Organization, Person, Project } from '@/lib/types/models';
import { BottomDrawer } from '@/components/ui/bottom-drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { OrganizationJobType, FILM_COUNTRIES } from '@/lib/types/models';
import { ChevronLeft, Mail, Phone, Globe, MapPin, Trash2, Plus, X, ExternalLink } from 'lucide-react';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { OrgLogo } from './org-logo';

interface OrgDetailContentProps {
  organization: Organization;
  onClose: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenPerson?: (person: Person) => void;
}

function OrgDetailContent({ organization, onClose, onOpenProject, onOpenPerson }: OrgDetailContentProps) {
  const [editedOrg, setEditedOrg] = useState<Organization>(organization);
  const [useCustomInvoice, setUseCustomInvoice] = useState(hasCustomInvoice(organization));
  const [addingPerson, setAddingPerson] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newPersonId, setNewPersonId] = useState<string | null>(null);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const lastOrgIdRef = useRef<string>(organization.id);

  const updateOrganization = useOrganizationsStore(state => state.updateOrganization);
  const deleteOrganization = useOrganizationsStore(state => state.deleteOrganization);
  const people = usePeopleStore(state => state.people);
  const fetchPeople = usePeopleStore(state => state.fetchPeople);
  const updatePerson = usePeopleStore(state => state.updatePerson);
  const projects = useProjectsStore(state => state.projects);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);
  const updateProject = useProjectsStore(state => state.updateProject);

  const orgPeople = people.filter(p => p.organization_id === organization.id);
  const orgProjects = projects.filter(p => p.client_organization_id === organization.id);

  useEffect(() => {
    if (lastOrgIdRef.current !== organization.id) {
      lastOrgIdRef.current = organization.id;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedOrg(organization);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseCustomInvoice(hasCustomInvoice(organization));
    }
    if (people.length === 0) fetchPeople();
    if (projects.length === 0) fetchProjects();
  }, [organization.id, fetchPeople, people.length, fetchProjects, projects.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(editedOrg) !== JSON.stringify(organization)) {
        updateOrganization(organization.id, editedOrg);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editedOrg, organization, updateOrganization]);

  const updateField = <K extends keyof Organization>(field: K, value: Organization[K]) => {
    setEditedOrg(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${organization.name}?`)) {
      await deleteOrganization(organization.id);
      onClose();
    }
  };

  const clearCustomInvoice = () => {
    setEditedOrg(prev => ({ ...prev, name_invoice: null, street_invoice: null, street2_invoice: null, zip_invoice: null, city_invoice: null, country_invoice: null }));
  };

  const orgTypeOptions = Object.values(OrganizationJobType).map(t => ({ value: t, label: t }));

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── DETAIL HEADER ── */}
      <div className="shrink-0 border-b bg-card px-5 py-3 flex items-center gap-3">
        <button
          onClick={onClose}
          aria-label="Back to list"
          className="flex items-center gap-1 group text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" />
        </button>
        <OrgLogo organization={editedOrg} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] truncate">{editedOrg.name}</div>
          <div className="flex items-center gap-3 mt-0.5 text-[12px] text-muted-foreground flex-wrap">
            {editedOrg.jobs?.[0] && <span>{editedOrg.jobs[0]}</span>}
            {editedOrg.contact_email && <a href={`mailto:${editedOrg.contact_email}`} className="flex items-center gap-1 hover:text-primary hover:underline"><Mail className="h-3 w-3" />{editedOrg.contact_email}</a>}
            {editedOrg.contact_phone && <a href={`tel:${editedOrg.contact_phone}`} className="flex items-center gap-1 hover:text-primary hover:underline"><Phone className="h-3 w-3" />{editedOrg.contact_phone}</a>}
            {editedOrg.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{editedOrg.city}{editedOrg.country ? `, ${editedOrg.country}` : ''}</span>}
          </div>
        </div>
      </div>

      {/* ── INFO SECTION ── */}
      <div className="border-b px-4 py-3 grid grid-cols-3 gap-3 shrink-0">

        {/* Basic Info */}
        <div className="section-card">
          <div className="section-card-header">Basic Information</div>
          <div className="section-card-body space-y-1.5 detail-form-fields">
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Organization Name</Label>
            <div className="flex items-center gap-1.5">
              <OrgLogo organization={editedOrg} size="sm" />
              <Input value={editedOrg.name} onChange={e => updateField('name', e.target.value)} className="h-7 text-xs flex-1" />
            </div>
          </div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Business Type</Label><MultiSelect options={orgTypeOptions} selected={editedOrg.jobs || []} onChange={jobs => updateField('jobs', jobs as OrganizationJobType[])} placeholder="Select types…" maxSelections={3} /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Email</Label><Input type="email" value={editedOrg.contact_email || ''} onChange={e => updateField('contact_email', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Phone</Label><Input type="tel" value={editedOrg.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Website</Label>
            <Input value={editedOrg.website || ''} onChange={e => updateField('website', e.target.value || null)} onBlur={() => { const v = (editedOrg.website || '').trim(); if (v && !v.startsWith('http')) updateField('website', 'https://' + v); }} className="h-7 text-xs" />
          </div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Notes</Label><Textarea value={editedOrg.notes || ''} onChange={e => updateField('notes', e.target.value || null)} rows={3} className="text-xs resize-none" /></div>
          </div>
        </div>

        {/* Address */}
        <div className="section-card">
          <div className="section-card-header">Main Address</div>
          <div className="section-card-body space-y-1.5 detail-form-fields">
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Street</Label><Input value={editedOrg.street || ''} onChange={e => updateField('street', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Street 2</Label><Input value={editedOrg.street2 || ''} onChange={e => updateField('street2', e.target.value || null)} className="h-7 text-xs" /></div>
          <div className="grid grid-cols-[70px_1fr] gap-1">
            <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">ZIP</Label><Input value={editedOrg.zip || ''} onChange={e => updateField('zip', e.target.value || null)} className="h-7 text-xs" /></div>
            <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">City</Label><Input value={editedOrg.city || ''} onChange={e => updateField('city', e.target.value || null)} className="h-7 text-xs" /></div>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">Country</Label>
            <SearchableSelect options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} value={editedOrg.country || null} onChange={v => updateField('country', v)} placeholder="Search country..." />
          </div>

          {/* Invoice address toggle */}
          <div className="pt-1">
            <div className="flex items-center justify-between border-b pb-0.5 mb-1">
              <h3 className="text-[10px] font-semibold uppercase text-gray-500">Invoice Address</h3>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={useCustomInvoice} onChange={e => { setUseCustomInvoice(e.target.checked); if (!e.target.checked) clearCustomInvoice(); }} className="h-3 w-3" />
                <span className="text-[10px] text-gray-500">Custom</span>
              </label>
            </div>
            {useCustomInvoice && (
              <div className="space-y-1">
                <Input value={editedOrg.name_invoice || ''} onChange={e => updateField('name_invoice', e.target.value || null)} placeholder={editedOrg.name} className="h-7 text-xs" />
                <Input value={editedOrg.street_invoice || ''} onChange={e => updateField('street_invoice', e.target.value || null)} placeholder={editedOrg.street || 'Street'} className="h-7 text-xs" />
                <div className="grid grid-cols-[70px_1fr] gap-1">
                  <Input value={editedOrg.zip_invoice || ''} onChange={e => updateField('zip_invoice', e.target.value || null)} placeholder={editedOrg.zip || 'ZIP'} className="h-7 text-xs" />
                  <Input value={editedOrg.city_invoice || ''} onChange={e => updateField('city_invoice', e.target.value || null)} placeholder={editedOrg.city || 'City'} className="h-7 text-xs" />
                </div>
                <SearchableSelect options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} value={editedOrg.country_invoice || null} onChange={v => updateField('country_invoice', v)} placeholder="Search country..." />
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Financial */}
        <div className="section-card">
          <div className="section-card-header">Financial</div>
          <div className="section-card-body space-y-1.5 detail-form-fields">
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">VAT Number</Label><Input value={editedOrg.financial_details?.vat_number || ''} onChange={e => updateField('financial_details', { ...editedOrg.financial_details, id: editedOrg.financial_details?.id ?? '', vat_number: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">Bank Name</Label><Input value={editedOrg.financial_details?.bank_name || ''} onChange={e => updateField('financial_details', { ...editedOrg.financial_details, id: editedOrg.financial_details?.id ?? '', bank_name: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">IBAN</Label><Input value={editedOrg.financial_details?.iban || ''} onChange={e => updateField('financial_details', { ...editedOrg.financial_details, id: editedOrg.financial_details?.id ?? '', iban: e.target.value || null })} className="h-7 text-xs" /></div>
          <div className="space-y-0.5"><Label className="text-[10px] text-gray-500">BIC / SWIFT</Label><Input value={editedOrg.financial_details?.bic || ''} onChange={e => updateField('financial_details', { ...editedOrg.financial_details, id: editedOrg.financial_details?.id ?? '', bic: e.target.value || null })} className="h-7 text-xs" /></div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTIONS (scrollable) ── */}
      <div className="flex-1 overflow-y-auto">

        {/* People */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">People</span>
          {!addingPerson && (
            <Button size="sm" variant="ghost" onClick={() => setAddingPerson(true)} className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />Add Person
            </Button>
          )}
        </div>
        <div className="px-4 py-2 border-b">
          {addingPerson && (
            <div className="flex gap-2 items-center mb-2">
              <SearchableSelect
                options={people.map(p => ({ id: p.id, label: p.name, sublabel: p.jobs?.[0] }))}
                value={newPersonId}
                onChange={setNewPersonId}
                placeholder="Search person…"
                className="flex-1"
              />
              <Button size="sm" onClick={async () => { if (!newPersonId) return; await updatePerson(newPersonId, { organization_id: organization.id }); setNewPersonId(null); setAddingPerson(false); }} className="h-7 text-xs" disabled={!newPersonId}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingPerson(false); setNewPersonId(null); }} className="h-7 text-xs">Cancel</Button>
            </div>
          )}
          {orgPeople.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">No people in this organization.</p>
          ) : (
            <div className="space-y-1">
              {orgPeople.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.jobs?.length ? <div className="text-gray-400 truncate">{p.jobs.join(', ')}</div> : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onOpenPerson && (
                      <button type="button" onClick={() => onOpenPerson(p)} className="text-gray-400 hover:text-blue-600" title="Open person detail">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => updatePerson(p.id, { organization_id: null })} className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 shrink-0">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Projects</span>
          {!addingProject && (
            <Button size="sm" variant="ghost" onClick={() => setAddingProject(true)} className="h-6 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />Link Project
            </Button>
          )}
        </div>
        <div className="px-4 py-2">
          {addingProject && (
            <div className="flex gap-2 items-center mb-2">
              <SearchableSelect
                options={projects.filter(p => p.client_organization_id !== organization.id).map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
                value={newProjectId}
                onChange={setNewProjectId}
                placeholder="Search project…"
                className="flex-1"
              />
              <Button size="sm" onClick={async () => { if (!newProjectId) return; await updateProject(newProjectId, { client_organization_id: organization.id }); setNewProjectId(null); setAddingProject(false); }} className="h-7 text-xs" disabled={!newProjectId}>Link</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingProject(false); setNewProjectId(null); }} className="h-7 text-xs">Cancel</Button>
            </div>
          )}
          {orgProjects.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">No projects associated.</p>
          ) : (
            <div className="space-y-1">
              {orgProjects.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-gray-400">{p.project_number} · {p.status}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onOpenProject && (
                      <button type="button" onClick={() => onOpenProject(p)} className="text-gray-400 hover:text-blue-600" title="Open project detail">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => updateProject(p.id, { client_organization_id: null })} className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 shrink-0">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t bg-muted/40 px-5 py-2 flex items-center justify-between shrink-0">
        <EntryMetadata createdAt={organization.created_at} updatedAt={organization.updated_at} userId={organization.user_id} />
        <Button variant="ghost" size="icon-sm" onClick={handleDelete} className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10" aria-label="Delete organization">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function hasCustomInvoice(org: Organization) {
  return !!(org.name_invoice || org.street_invoice || org.street2_invoice || org.zip_invoice || org.city_invoice || org.country_invoice);
}

// ─── Overlay drawer ────────────────────────────────────────────────────────────

interface OrganizationDetailDrawerProps {
  organization: Organization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationDetailDrawer({ organization, open, onOpenChange }: OrganizationDetailDrawerProps) {
  return (
    <BottomDrawer open={open} onOpenChange={onOpenChange}>
      <OrgDetailContent organization={organization} onClose={() => onOpenChange(false)} />
    </BottomDrawer>
  );
}

// ─── Inline pane ───────────────────────────────────────────────────────────────

interface OrgDetailPaneProps {
  organization: Organization;
  onClose: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenPerson?: (person: Person) => void;
}

export function OrgDetailPane({ organization, onClose, onOpenProject, onOpenPerson }: OrgDetailPaneProps) {
  return <OrgDetailContent organization={organization} onClose={onClose} onOpenProject={onOpenProject} onOpenPerson={onOpenPerson} />;
}
