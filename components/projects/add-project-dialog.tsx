'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { SupabaseService } from '@/lib/services/supabase-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { InlineDateRangePicker } from '@/components/ui/date-range-picker';
import { ProjectStatus, FILM_COUNTRIES, OrganizationJobType } from '@/lib/types/models';
import type { Organization } from '@/lib/types/models';
import { Search, X, Plus } from 'lucide-react';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProjectDialog({ open, onOpenChange }: AddProjectDialogProps) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const tOrgs = useTranslations('organizations');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.Inquiry);
  const [notes, setNotes] = useState('');
  const [inquiryCountry, setInquiryCountry] = useState('');
  const [shootingLocation, setShootingLocation] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [clientOrgId, setClientOrgId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextProjectNumber, setNextProjectNumber] = useState<string>('…');

  // Org search state
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // Inline org quick-create state
  const [showOrgCreate, setShowOrgCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const addProject = useProjectsStore(state => state.addProject);
  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);
  const addOrganization = useOrganizationsStore(state => state.addOrganization);

  // Load next project number and orgs when dialog opens
  useEffect(() => {
    if (!open) return;
    SupabaseService.getNextProjectNumber().then(setNextProjectNumber);
    if (organizations.length === 0) fetchOrganizations();
  }, [open, fetchOrganizations, organizations.length]);

  const resetForm = () => {
    setName('');
    setStatus(ProjectStatus.Inquiry);
    setNotes('');
    setInquiryCountry('');
    setShootingLocation('');
    setStartDate(null);
    setEndDate(null);
    setClientOrgId(null);
    setOrgSearchQuery('');
    setShowOrgCreate(false);
    setNewOrgName('');
    setNewOrgType('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addProject({
        name,
        status,
        notes: notes || null,
        inquiry_country: inquiryCountry || null,
        shooting_location: shootingLocation || null,
        start_date: startDate,
        end_date: endDate,
        client_organization_id: clientOrgId,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      const created = await addOrganization({
        name: newOrgName.trim(),
        jobs: newOrgType ? [newOrgType as OrganizationJobType] : [],
      });
      if (created) {
        setClientOrgId(created.id);
      }
      setShowOrgCreate(false);
      setNewOrgName('');
      setNewOrgType('');
    } catch (error) {
      console.error('Error creating organization:', error);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const selectedOrg: Organization | null = organizations.find(o => o.id === clientOrgId) ?? null;
  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(orgSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">{t('newProject')}</DialogTitle>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {nextProjectNumber}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {/* Left column: fields */}
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">{t('fields.name')} *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('fields.namePlaceholder')} required disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">{t('fields.status')}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)} disabled={isSubmitting}>
                  <SelectTrigger size="xs" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjectStatus).map((s) => (
                      <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">{t('fields.clientOrganization')}</Label>
                {selectedOrg ? (
                  <div className="flex items-center gap-1 h-7 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
                    <span className="flex-1 truncate">{selectedOrg.name}</span>
                    <button type="button" onClick={() => { setClientOrgId(null); setShowOrgCreate(false); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className="relative flex-1">
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
                          placeholder={`${tOrgs('searchOrganizations')}`}
                          disabled={isSubmitting}
                          className="h-7 text-xs pl-6"
                        />
                        {orgDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredOrgs.length === 0 ? (
                              <div className="text-xs text-gray-400 px-2 py-1.5">{tOrgs('noOrganizationsMatch')}</div>
                            ) : filteredOrgs.map((org) => (
                              <button key={org.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setClientOrgId(org.id); setOrgSearchQuery(''); setOrgDropdownOpen(false); }} className="w-full text-left text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{org.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2 shrink-0" onClick={() => setShowOrgCreate(!showOrgCreate)} disabled={isSubmitting}>
                        <Plus className="h-3 w-3 mr-1" />{tCommon('create')}
                      </Button>
                    </div>
                    {showOrgCreate && (
                      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded p-2 space-y-1.5 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-[10px] font-medium text-gray-500 uppercase">{tOrgs('newOrganization')}</p>
                        <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder={tOrgs('fields.namePlaceholder')} className="h-7 text-xs" disabled={isCreatingOrg} autoFocus />
                        <SearchableSelect
                          options={Object.values(OrganizationJobType).map(t => ({ id: t, label: t }))}
                          value={newOrgType || null}
                          onChange={(v) => setNewOrgType(v ?? '')}
                          placeholder={`${tCommon('search')}…`}
                        />
                        <div className="flex gap-1">
                          <Button type="button" size="sm" className="h-6 text-xs flex-1" onClick={handleCreateOrg} disabled={!newOrgName.trim() || isCreatingOrg}>{isCreatingOrg ? tCommon('saving') : tCommon('create')}</Button>
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setShowOrgCreate(false); setNewOrgName(''); setNewOrgType(''); }} disabled={isCreatingOrg}>{tCommon('cancel')}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">{t('fields.inquiryCountry')}</Label>
                <SearchableSelect
                  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty
                  value={inquiryCountry || null}
                  onChange={(v) => setInquiryCountry(v ?? '')}
                  placeholder={`${tCommon('search')}…`}
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">{t('fields.shootingLocation')}</Label>
                <Input value={shootingLocation} onChange={(e) => setShootingLocation(e.target.value)} placeholder={t('fields.shootingLocation')} disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">{t('fields.notes')}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('fields.notes')} rows={3} disabled={isSubmitting} className="text-xs resize-none" />
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-gray-500 block mb-1.5">{t('sections.schedule')}</Label>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800/50">
                <InlineDateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChangeStart={setStartDate}
                  onChangeEnd={setEndDate}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={isSubmitting}>
              {isSubmitting ? tCommon('saving') : t('addProject')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
