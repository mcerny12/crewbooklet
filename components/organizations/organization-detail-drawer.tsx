'use client';

import { useState, useEffect, useRef } from 'react';
import type { Organization, Person, Project } from '@/lib/types/models';
import { BottomDrawer } from '@/components/ui/bottom-drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MultiSearchSelect } from '@/components/ui/multi-search-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePeopleStore } from '@/lib/stores/people-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { OrganizationJobType, FILM_COUNTRIES } from '@/lib/types/models';
import { ChevronLeft, Mail, Phone, MapPin, Trash2, Plus, X, ExternalLink } from 'lucide-react';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { OrgLogo } from './org-logo';
import { useIsMobile } from '@/lib/hooks/use-media-query';
import { OrgMobileDetail } from './org-mobile-detail';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { DetailFrame, DesktopDetailSnapCanvas, DetailSlide } from '@/components/detail';
import { AddPersonDialog } from '@/components/people/add-person-dialog';
import { OrgStructureSection } from './org-structure-section';
import { OrgRole } from '@/lib/types/models';

interface OrgDetailContentProps {
  organization: Organization;
  onClose: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenPerson?: (person: Person) => void;
}

function OrgDetailContent({ organization, onClose, onOpenProject, onOpenPerson }: OrgDetailContentProps) {
  const isMobile = useIsMobile();
  const [editedOrg, setEditedOrg] = useState<Organization>(organization);
  const [useCustomInvoice, setUseCustomInvoice] = useState(hasCustomInvoice(organization));
  const [addingPerson, setAddingPerson] = useState(false);
  const [addPersonDialogOpen, setAddPersonDialogOpen] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newPersonId, setNewPersonId] = useState<string | null>(null);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const lastOrgIdRef = useRef<string>(organization.id);

  const updateOrganization = useOrganizationsStore(state => state.updateOrganization);
  const deleteOrganization = useOrganizationsStore(state => state.deleteOrganization);
  const organizations = useOrganizationsStore(state => state.organizations);
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

  // Keep hierarchy fields in editedOrg current after OrgStructureSection saves them
  // independently — prevents the auto-save below from reverting a role change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditedOrg(prev => ({
      ...prev,
      org_role: organization.org_role,
      parent_organization_id: organization.parent_organization_id,
    }));
  }, [organization.org_role, organization.parent_organization_id]);

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
  const fdBase = { id: editedOrg.financial_details?.id ?? '', ...editedOrg.financial_details };
  const parentOrg = organization.org_role === OrgRole.Subsidiary && organization.parent_organization_id
    ? organizations.find(o => o.id === organization.parent_organization_id) ?? null
    : null;

  if (isMobile) {
    return (
      <OrgMobileDetail
        organization={organization}
        editedOrg={editedOrg}
        updateField={updateField}
        useCustomInvoice={useCustomInvoice}
        setUseCustomInvoice={setUseCustomInvoice}
        clearCustomInvoice={clearCustomInvoice}
        orgPeople={orgPeople}
        orgProjects={orgProjects}
        allPeople={people}
        allProjects={projects}
        updatePerson={(id, updates) => updatePerson(id, updates)}
        updateProject={(id, updates) => updateProject(id, updates)}
        onClose={onClose}
        onDelete={handleDelete}
        onOpenProject={onOpenProject}
        onOpenPerson={onOpenPerson}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background" data-cb-component="OrgDetailPane">

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
            {organization.org_role === OrgRole.Mother && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">Mother</span>
            )}
            {parentOrg && (
              <span className="text-[11px] text-muted-foreground">↳ {parentOrg.name}</span>
            )}
            {editedOrg.contact_email && <a href={`mailto:${editedOrg.contact_email}`} className="flex items-center gap-1 hover:text-primary hover:underline"><Mail className="h-3 w-3" />{editedOrg.contact_email}</a>}
            {editedOrg.contact_phone && <a href={`tel:${editedOrg.contact_phone}`} className="flex items-center gap-1 hover:text-primary hover:underline"><Phone className="h-3 w-3" />{editedOrg.contact_phone}</a>}
            {editedOrg.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{editedOrg.city}{editedOrg.country ? `, ${editedOrg.country}` : ''}</span>}
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL SLIDE CANVAS — each slide holds 1–2 frames ── */}
      <DesktopDetailSnapCanvas ariaLabel="Organization detail slides">

        <DetailSlide ariaLabel="Organization basics and contact" tabLabel="Basics">
        <DetailFrame title="Basic Information" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5" data-cb-field="name">
              <Label className="text-[10px] text-gray-500">Organization Name</Label>
              <div className="flex items-center gap-1.5">
                <OrgLogo organization={editedOrg} size="sm" />
                <Input value={editedOrg.name} onChange={e => updateField('name', e.target.value)} className="h-7 text-xs flex-1" />
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Business Type</Label>
              <MultiSearchSelect options={orgTypeOptions} selected={editedOrg.jobs || []} onChange={jobs => updateField('jobs', jobs as OrganizationJobType[])} placeholder="Search types…" maxSelections={3} />
            </div>
          </div>
        </DetailFrame>

        <DetailFrame title="Contact" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5" data-cb-field="email">
              <Label className="text-[10px] text-gray-500">Email</Label>
              <Input type="email" value={editedOrg.contact_email || ''} onChange={e => updateField('contact_email', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5" data-cb-field="phone">
              <Label className="text-[10px] text-gray-500">Phone</Label>
              <Input type="tel" value={editedOrg.contact_phone || ''} onChange={e => updateField('contact_phone', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Website</Label>
              <Input
                value={editedOrg.website || ''}
                onChange={e => updateField('website', e.target.value || null)}
                onBlur={() => { const v = (editedOrg.website || '').trim(); if (v && !v.startsWith('http')) updateField('website', 'https://' + v); }}
                className="h-7 text-xs"
              />
            </div>
          </div>
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Organization structure" tabLabel="Structure">
          <DetailFrame title="Organization Structure" className="flex-1">
            <OrgStructureSection organization={organization} />
          </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Organization people" tabLabel="People">
        <DetailFrame
          title="People"
          description={orgPeople.length > 0 ? `${orgPeople.length} linked` : undefined}
          className="flex-1"
          action={
            !addingPerson ? (
              <Button size="sm" variant="ghost" onClick={() => setAddingPerson(true)} className="h-7 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />Add Person
              </Button>
            ) : null
          }
        >
          {addingPerson && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2 items-center">
                <SearchableSelect
                  options={people.filter(p => p.organization_id !== organization.id).map(p => ({ id: p.id, label: p.name, sublabel: p.jobs?.[0] }))}
                  value={newPersonId}
                  onChange={setNewPersonId}
                  placeholder="Search existing person…"
                  showOptionsWhenEmpty
                  className="flex-1"
                />
                <Button size="sm" disabled={!newPersonId} onClick={async () => { if (!newPersonId) return; await updatePerson(newPersonId, { organization_id: organization.id }); setNewPersonId(null); setAddingPerson(false); }} className="h-7 text-xs">Link</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingPerson(false); setNewPersonId(null); }} className="h-7 text-xs">Cancel</Button>
              </div>
              <button
                type="button"
                onClick={() => { setAddingPerson(false); setAddPersonDialogOpen(true); }}
                className="text-xs text-primary hover:underline"
              >
                + Create new person
              </button>
            </div>
          )}
          {orgPeople.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No people in this organization.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-2 px-2 py-1 border-b text-[10px] font-semibold uppercase text-muted-foreground sticky top-0 bg-card">
                <div>Name</div>
                <div>Jobs</div>
                <div>Contact</div>
                <div />
              </div>
              {orgPeople.map(p => (
                <div key={p.id} className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-2 px-2 py-1.5 border rounded text-xs items-center hover:bg-muted/30">
                  <div className="font-medium truncate" title={p.name}>{p.name}</div>
                  <div className="text-muted-foreground truncate">{p.jobs?.length ? p.jobs.join(', ') : <span>—</span>}</div>
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1 hover:text-primary min-w-0" title={p.email}>
                        <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{p.email}</span>
                      </a>
                    )}
                    {!p.email && p.mobile_phone && (
                      <a href={`tel:${p.mobile_phone}`} className="flex items-center gap-1 hover:text-primary min-w-0" title={p.mobile_phone}>
                        <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{p.mobile_phone}</span>
                      </a>
                    )}
                    {!p.email && !p.mobile_phone && <span>—</span>}
                  </div>
                  <div className="flex items-center gap-0.5 justify-end">
                    {onOpenPerson && (
                      <button type="button" onClick={() => onOpenPerson(p)} className="text-muted-foreground hover:text-primary p-1" title="Open person detail" aria-label={`Open ${p.name}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => updatePerson(p.id, { organization_id: null })} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" aria-label={`Unlink ${p.name}`}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Organization projects" tabLabel="Projects">
        <DetailFrame
          title="Projects"
          description={orgProjects.length > 0 ? `${orgProjects.length} linked` : undefined}
          className="flex-1"
          action={
            !addingProject ? (
              <Button size="sm" variant="ghost" onClick={() => setAddingProject(true)} className="h-7 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />Link Project
              </Button>
            ) : null
          }
        >
          {addingProject && (
            <div className="mb-3 flex gap-2 items-center">
              <SearchableSelect
                options={projects.filter(p => p.client_organization_id !== organization.id).map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
                value={newProjectId}
                onChange={setNewProjectId}
                placeholder="Search project…"
                className="flex-1"
              />
              <Button size="sm" disabled={!newProjectId} onClick={async () => { if (!newProjectId) return; await updateProject(newProjectId, { client_organization_id: organization.id }); setNewProjectId(null); setAddingProject(false); }} className="h-7 text-xs">Link</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingProject(false); setNewProjectId(null); }} className="h-7 text-xs">Cancel</Button>
            </div>
          )}
          {orgProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No projects associated.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-2 px-2 py-1 border-b text-[10px] font-semibold uppercase text-muted-foreground sticky top-0 bg-card">
                <div>Project</div>
                <div>Number</div>
                <div>Status</div>
                <div>Location</div>
                <div />
              </div>
              {orgProjects.map(p => (
                <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-2 px-2 py-1.5 border rounded text-xs items-center hover:bg-muted/30">
                  <div className="font-medium truncate" title={p.name}>{p.name}</div>
                  <div className="text-muted-foreground truncate">{p.project_number}</div>
                  <div><ProjectStatusBadge status={p.status} /></div>
                  <div className="text-muted-foreground truncate" title={p.shooting_location ?? undefined}>
                    {p.shooting_location || (p.inquiry_country ?? <span>—</span>)}
                  </div>
                  <div className="flex items-center gap-0.5 justify-end">
                    {onOpenProject && (
                      <button type="button" onClick={() => onOpenProject(p)} className="text-muted-foreground hover:text-primary p-1" title="Open project detail" aria-label={`Open ${p.name}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => updateProject(p.id, { client_organization_id: null })} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" aria-label={`Unlink ${p.name}`}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Organization address and invoice" tabLabel="Address">
        <DetailFrame title="Address" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Street</Label>
              <Input value={editedOrg.street || ''} onChange={e => updateField('street', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Street 2</Label>
              <Input value={editedOrg.street2 || ''} onChange={e => updateField('street2', e.target.value || null)} className="h-7 text-xs" />
            </div>
            <div className="grid grid-cols-[70px_1fr] gap-1">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">ZIP</Label>
                <Input value={editedOrg.zip || ''} onChange={e => updateField('zip', e.target.value || null)} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">City</Label>
                <Input value={editedOrg.city || ''} onChange={e => updateField('city', e.target.value || null)} className="h-7 text-xs" />
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Country</Label>
              <SearchableSelect options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty value={editedOrg.country || null} onChange={v => updateField('country', v)} placeholder="Search country..." />
            </div>
          </div>
        </DetailFrame>

        <DetailFrame
          title="Invoice Address"
          className="flex-1"
          action={
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={useCustomInvoice} onChange={e => { setUseCustomInvoice(e.target.checked); if (!e.target.checked) clearCustomInvoice(); }} className="h-3 w-3" />
              <span className="text-[10px] text-muted-foreground">Custom</span>
            </label>
          }
        >
          {useCustomInvoice ? (
            <div className="space-y-2 detail-form-fields">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Invoice Name</Label>
                <Input value={editedOrg.name_invoice || ''} onChange={e => updateField('name_invoice', e.target.value || null)} placeholder={editedOrg.name} className="h-7 text-xs" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Street</Label>
                <Input value={editedOrg.street_invoice || ''} onChange={e => updateField('street_invoice', e.target.value || null)} placeholder={editedOrg.street || 'Street'} className="h-7 text-xs" />
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-1">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">ZIP</Label>
                  <Input value={editedOrg.zip_invoice || ''} onChange={e => updateField('zip_invoice', e.target.value || null)} placeholder={editedOrg.zip || 'ZIP'} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">City</Label>
                  <Input value={editedOrg.city_invoice || ''} onChange={e => updateField('city_invoice', e.target.value || null)} placeholder={editedOrg.city || 'City'} className="h-7 text-xs" />
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Country</Label>
                <SearchableSelect options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty value={editedOrg.country_invoice || null} onChange={v => updateField('country_invoice', v)} placeholder="Search country..." />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-1">Uses main address by default. Toggle Custom to override.</p>
          )}
        </DetailFrame>
        </DetailSlide>

        <DetailSlide ariaLabel="Organization financial and notes" tabLabel="Financial">
        <DetailFrame title="Financial" className="flex-1">
          <div className="space-y-2 detail-form-fields">
            <div className="space-y-0.5" data-cb-field="vat">
              <Label className="text-[10px] text-gray-500">VAT Number</Label>
              <Input value={editedOrg.financial_details?.vat_number || ''} onChange={e => updateField('financial_details', { ...fdBase, vat_number: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Bank Name</Label>
              <Input value={editedOrg.financial_details?.bank_name || ''} onChange={e => updateField('financial_details', { ...fdBase, bank_name: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5" data-cb-field="iban">
              <Label className="text-[10px] text-gray-500">IBAN</Label>
              <Input value={editedOrg.financial_details?.iban || ''} onChange={e => updateField('financial_details', { ...fdBase, iban: e.target.value || null })} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">BIC / SWIFT</Label>
              <Input value={editedOrg.financial_details?.bic || ''} onChange={e => updateField('financial_details', { ...fdBase, bic: e.target.value || null })} className="h-7 text-xs" />
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
              aria-label="Delete organization"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <div className="flex h-full flex-col gap-3 detail-form-fields">
            <div className="space-y-0.5 flex-1 min-h-0 flex flex-col">
              <Label className="text-[10px] text-gray-500">Notes</Label>
              <Textarea
                value={editedOrg.notes || ''}
                onChange={e => updateField('notes', e.target.value || null)}
                className="flex-1 text-xs resize-none min-h-20"
              />
            </div>
            <div className="border-t pt-2">
              <EntryMetadata createdAt={organization.created_at} updatedAt={organization.updated_at} userId={organization.user_id} />
            </div>
          </div>
        </DetailFrame>
        </DetailSlide>

      </DesktopDetailSnapCanvas>

      <AddPersonDialog
        open={addPersonDialogOpen}
        onOpenChange={setAddPersonDialogOpen}
        organizationId={organization.id}
      />
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
