'use client';

import { useState } from 'react';
import type { Organization, Person, Project } from '@/lib/types/models';
import { OrganizationJobType, FILM_COUNTRIES } from '@/lib/types/models';
import { MobileEntityDetailLayout } from '@/components/mobile/mobile-entity-detail-layout';
import { MobileSwipeTabs } from '@/components/mobile/mobile-swipe-tabs';
import type { MobileSwipeTab } from '@/components/mobile/mobile-swipe-tabs';
import { MobileField, mobileInputCn, mobileTextareaCn } from '@/components/mobile/mobile-field';
import { MobileEmptyState } from '@/components/mobile/mobile-empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MultiSearchSelect } from '@/components/ui/multi-search-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EntryMetadata } from '@/components/ui/entry-metadata';
import { OrgLogo } from './org-logo';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { Trash2, Plus, X, ExternalLink, Users, Briefcase } from 'lucide-react';
import { OrgStructureSection } from './org-structure-section';

export type OrgMobileDetailProps = {
  organization: Organization;
  editedOrg: Organization;
  updateField: <K extends keyof Organization>(field: K, value: Organization[K]) => void;
  useCustomInvoice: boolean;
  setUseCustomInvoice: (v: boolean) => void;
  clearCustomInvoice: () => void;
  orgPeople: Person[];
  orgProjects: Project[];
  allPeople: { id: string; name: string; jobs?: string[] }[];
  allProjects: { id: string; name: string; project_number: string; client_organization_id?: string | null }[];
  updatePerson: (id: string, updates: { organization_id: string | null }) => Promise<void>;
  updateProject: (id: string, updates: { client_organization_id: string | null }) => Promise<void>;
  onClose: () => void;
  onDelete: () => void;
  onOpenProject?: (project: Project) => void;
  onOpenPerson?: (person: Person) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
};

const orgTypeOptions = Object.values(OrganizationJobType).map(t => ({ value: t, label: t }));

// ── Overview tab ───────────────────────────────────────────────

function OverviewTab({ editedOrg, updateField }: {
  editedOrg: Organization;
  updateField: <K extends keyof Organization>(field: K, value: Organization[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <MobileField label="Organization Name">
        <div className="flex items-center gap-2">
          <OrgLogo organization={editedOrg} size="sm" />
          <Input
            value={editedOrg.name}
            onChange={e => updateField('name', e.target.value)}
            className={`${mobileInputCn} flex-1`}
          />
        </div>
      </MobileField>

      <MobileField label="Business Type">
        <MultiSearchSelect
          options={orgTypeOptions}
          selected={editedOrg.jobs || []}
          onChange={jobs => updateField('jobs', jobs as OrganizationJobType[])}
          placeholder="Search types…"
          maxSelections={3}
        />
      </MobileField>

      <MobileField label="Email">
        <Input
          type="email"
          value={editedOrg.contact_email || ''}
          onChange={e => updateField('contact_email', e.target.value || null)}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="Phone">
        <Input
          type="tel"
          value={editedOrg.contact_phone || ''}
          onChange={e => updateField('contact_phone', e.target.value || null)}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="Website">
        <Input
          type="url"
          value={editedOrg.website || ''}
          onChange={e => updateField('website', e.target.value || null)}
          onBlur={() => {
            const v = (editedOrg.website || '').trim();
            if (v && !v.startsWith('http')) updateField('website', 'https://' + v);
          }}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="Street">
        <Input value={editedOrg.street || ''} onChange={e => updateField('street', e.target.value || null)} className={mobileInputCn} />
      </MobileField>

      <MobileField label="Street 2">
        <Input value={editedOrg.street2 || ''} onChange={e => updateField('street2', e.target.value || null)} className={mobileInputCn} />
      </MobileField>

      <div className="grid grid-cols-[100px_1fr] gap-3">
        <MobileField label="ZIP">
          <Input value={editedOrg.zip || ''} onChange={e => updateField('zip', e.target.value || null)} className={mobileInputCn} />
        </MobileField>
        <MobileField label="City">
          <Input value={editedOrg.city || ''} onChange={e => updateField('city', e.target.value || null)} className={mobileInputCn} />
        </MobileField>
      </div>

      <MobileField label="Country">
        <SearchableSelect
          options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty
          value={editedOrg.country || null}
          onChange={v => updateField('country', v)}
          placeholder="Search country..."
        />
      </MobileField>

      <MobileField label="Notes">
        <Textarea
          value={editedOrg.notes || ''}
          onChange={e => updateField('notes', e.target.value || null)}
          className={mobileTextareaCn}
          rows={3}
        />
      </MobileField>
    </div>
  );
}

// ── People tab ─────────────────────────────────────────────────

function PeopleTab({ orgPeople, allPeople, updatePerson, onOpenPerson, organizationId }: {
  orgPeople: Person[];
  allPeople: { id: string; name: string; jobs?: string[] }[];
  updatePerson: (id: string, updates: { organization_id: string | null }) => Promise<void>;
  onOpenPerson?: (person: Person) => void;
  organizationId: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newPersonId, setNewPersonId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {adding ? (
          <>
            <SearchableSelect
              options={allPeople.map(p => ({ id: p.id, label: p.name, sublabel: p.jobs?.[0] }))}
              value={newPersonId}
              onChange={setNewPersonId}
              placeholder="Search person…"
              className="flex-1"
            />
            <Button
              size="sm"
              disabled={!newPersonId}
              onClick={async () => {
                if (!newPersonId) return;
                await updatePerson(newPersonId, { organization_id: organizationId });
                setNewPersonId(null);
                setAdding(false);
              }}
              className="h-9 rounded-lg"
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setAdding(false); setNewPersonId(null); }}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setAdding(true)} className="w-full h-9 rounded-lg gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Person
          </Button>
        )}
      </div>

      {orgPeople.length === 0 ? (
        <MobileEmptyState
          icon={<Users className="h-8 w-8" />}
          title="No people"
          description="Add people to link them to this organization."
        />
      ) : (
        <div className="space-y-2">
          {orgPeople.map(person => (
            <div key={person.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{person.name}</p>
                {person.jobs?.length ? (
                  <p className="truncate text-xs text-muted-foreground">{person.jobs.join(', ')}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                {onOpenPerson && (
                  <button
                    type="button"
                    onClick={() => onOpenPerson(person)}
                    aria-label={`Open ${person.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => updatePerson(person.id, { organization_id: null })}
                  aria-label={`Remove ${person.name} from organization`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Projects tab ───────────────────────────────────────────────

function ProjectsTab({ orgProjects, allProjects, organizationId, updateProject, onOpenProject }: {
  orgProjects: Project[];
  allProjects: { id: string; name: string; project_number: string; client_organization_id?: string | null }[];
  organizationId: string;
  updateProject: (id: string, updates: { client_organization_id: string | null }) => Promise<void>;
  onOpenProject?: (project: Project) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const unlinkable = allProjects.filter(p => (p.client_organization_id ?? null) !== organizationId);

  return (
    <div className="space-y-3">
      {adding ? (
        <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
          <p className="text-sm font-medium">Link project</p>
          <SearchableSelect
            options={unlinkable.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
            value={newProjectId}
            onChange={setNewProjectId}
            placeholder="Search project…"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAdding(false); setNewProjectId(null); }} className="flex-1 h-9 rounded-lg">Cancel</Button>
            <Button
              disabled={!newProjectId}
              onClick={async () => {
                if (!newProjectId) return;
                await updateProject(newProjectId, { client_organization_id: organizationId });
                setNewProjectId(null);
                setAdding(false);
              }}
              className="flex-1 h-9 rounded-lg"
            >
              Link
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} className="w-full h-9 rounded-lg gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Link Project
        </Button>
      )}

      {orgProjects.length === 0 ? (
        <MobileEmptyState
          icon={<Briefcase className="h-8 w-8" />}
          title="No projects"
          description="Link projects to associate them with this organization."
        />
      ) : (
        <div className="space-y-3">
          {orgProjects.map(project => (
            <div key={project.id} className="rounded-xl border bg-card p-3 shadow-sm space-y-2">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.project_number}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ProjectStatusBadge status={project.status} />
                  {onOpenProject && (
                    <button
                      type="button"
                      onClick={() => onOpenProject(project)}
                      aria-label={`Open ${project.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateProject(project.id, { client_organization_id: null })}
                    aria-label={`Unlink ${project.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Financial tab ──────────────────────────────────────────────

function FinancialTab({ editedOrg, updateField, useCustomInvoice, setUseCustomInvoice, clearCustomInvoice, organization, onDelete }: {
  editedOrg: Organization;
  updateField: <K extends keyof Organization>(field: K, value: Organization[K]) => void;
  useCustomInvoice: boolean;
  setUseCustomInvoice: (v: boolean) => void;
  clearCustomInvoice: () => void;
  organization: Organization;
  onDelete: () => void;
}) {
  const fd = editedOrg.financial_details;
  const baseFd = { id: fd?.id ?? '', ...fd };

  return (
    <div className="space-y-4">
      <MobileField label="VAT Number">
        <Input
          value={fd?.vat_number || ''}
          onChange={e => updateField('financial_details', { ...baseFd, vat_number: e.target.value || null })}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="Bank Name">
        <Input
          value={fd?.bank_name || ''}
          onChange={e => updateField('financial_details', { ...baseFd, bank_name: e.target.value || null })}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="IBAN">
        <Input
          value={fd?.iban || ''}
          onChange={e => updateField('financial_details', { ...baseFd, iban: e.target.value || null })}
          className={mobileInputCn}
        />
      </MobileField>

      <MobileField label="BIC / SWIFT">
        <Input
          value={fd?.bic || ''}
          onChange={e => updateField('financial_details', { ...baseFd, bic: e.target.value || null })}
          className={mobileInputCn}
        />
      </MobileField>

      {/* Invoice address */}
      <div className="rounded-xl border bg-card p-3 shadow-sm space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useCustomInvoice}
            onChange={e => { setUseCustomInvoice(e.target.checked); if (!e.target.checked) clearCustomInvoice(); }}
            className="h-5 w-5 rounded"
          />
          <span className="text-sm font-medium">Use custom invoice address</span>
        </label>

        {useCustomInvoice && (
          <div className="space-y-3 pt-1">
            <MobileField label="Invoice Name">
              <Input
                value={editedOrg.name_invoice || ''}
                onChange={e => updateField('name_invoice', e.target.value || null)}
                placeholder={editedOrg.name}
                className={mobileInputCn}
              />
            </MobileField>
            <MobileField label="Invoice Street">
              <Input
                value={editedOrg.street_invoice || ''}
                onChange={e => updateField('street_invoice', e.target.value || null)}
                placeholder={editedOrg.street || 'Street'}
                className={mobileInputCn}
              />
            </MobileField>
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <MobileField label="ZIP">
                <Input
                  value={editedOrg.zip_invoice || ''}
                  onChange={e => updateField('zip_invoice', e.target.value || null)}
                  placeholder={editedOrg.zip || 'ZIP'}
                  className={mobileInputCn}
                />
              </MobileField>
              <MobileField label="City">
                <Input
                  value={editedOrg.city_invoice || ''}
                  onChange={e => updateField('city_invoice', e.target.value || null)}
                  placeholder={editedOrg.city || 'City'}
                  className={mobileInputCn}
                />
              </MobileField>
            </div>
            <MobileField label="Country">
              <SearchableSelect
                options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty
                value={editedOrg.country_invoice || null}
                onChange={v => updateField('country_invoice', v)}
                placeholder="Search country..."
              />
            </MobileField>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <EntryMetadata
          createdAt={organization.created_at}
          updatedAt={organization.updated_at}
          userId={organization.user_id}
        />
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete Organization
      </button>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────

export function OrgMobileDetail({
  organization, editedOrg, updateField,
  useCustomInvoice, setUseCustomInvoice, clearCustomInvoice,
  orgPeople, orgProjects, allPeople, allProjects,
  updatePerson, updateProject,
  onClose, onDelete, onOpenProject, onOpenPerson,
  activeTab, onTabChange,
}: OrgMobileDetailProps) {
  const tabs: MobileSwipeTab[] = [
    {
      value: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-4">
          <OverviewTab editedOrg={editedOrg} updateField={updateField} />
          <OrgStructureSection organization={organization} />
        </div>
      ),
    },
    {
      value: 'people',
      label: 'People',
      badge: orgPeople.length > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
          {orgPeople.length}
        </span>
      ) : undefined,
      content: (
        <PeopleTab
          orgPeople={orgPeople}
          allPeople={allPeople}
          updatePerson={updatePerson}
          onOpenPerson={onOpenPerson}
          organizationId={organization.id}
        />
      ),
    },
    {
      value: 'projects',
      label: 'Projects',
      badge: orgProjects.length > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
          {orgProjects.length}
        </span>
      ) : undefined,
      content: (
        <ProjectsTab
          orgProjects={orgProjects}
          allProjects={allProjects}
          organizationId={organization.id}
          updateProject={updateProject}
          onOpenProject={onOpenProject}
        />
      ),
    },
    {
      value: 'financial',
      label: 'Finance',
      content: (
        <FinancialTab
          editedOrg={editedOrg}
          updateField={updateField}
          useCustomInvoice={useCustomInvoice}
          setUseCustomInvoice={setUseCustomInvoice}
          clearCustomInvoice={clearCustomInvoice}
          organization={organization}
          onDelete={onDelete}
        />
      ),
    },
  ];

  return (
    <MobileEntityDetailLayout
      title={editedOrg.name}
      onBack={onClose}
    >
      <MobileSwipeTabs
        tabs={tabs}
        defaultValue="overview"
        value={activeTab}
        onValueChange={onTabChange}
        className="h-full"
      />
    </MobileEntityDetailLayout>
  );
}
