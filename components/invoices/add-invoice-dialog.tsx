'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useInvoiceStore } from '@/lib/stores/invoice-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { SupabaseService } from '@/lib/services/supabase-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { InvoiceStatus } from '@/lib/types/models';
import { addDays, format } from 'date-fns';

function dueDateFrom(dateStr: string): string {
  return format(addDays(new Date(dateStr), 30), 'yyyy-MM-dd');
}
import type { Invoice, Organization } from '@/lib/types/models';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AddInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (invoice: Invoice) => void;
}

export function AddInvoiceDialog({ open, onOpenChange, onCreated }: AddInvoiceDialogProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const appLocale = useLocale();
  const [nextNumber, setNextNumber] = useState('…');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressOverride, setShowAddressOverride] = useState(false);

  // Address override fields (only shown if user wants to change)
  const [overrideName, setOverrideName] = useState('');
  const [overrideStreet, setOverrideStreet] = useState('');
  const [overrideZip, setOverrideZip] = useState('');
  const [overrideCity, setOverrideCity] = useState('');
  const [overrideCountry, setOverrideCountry] = useState('');

  const addInvoice = useInvoiceStore(state => state.addInvoice);
  const projects = useProjectsStore(state => state.projects);
  const fetchProjects = useProjectsStore(state => state.fetchProjects);
  const organizations = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);

  useEffect(() => {
    if (!open) return;
    SupabaseService.getNextInvoiceNumber().then(setNextNumber);
    if (projects.length === 0) fetchProjects();
    if (organizations.length === 0) fetchOrganizations();
  }, [open, fetchProjects, fetchOrganizations, projects.length, organizations.length]);

  const selectedProject = projects.find(p => p.id === projectId) ?? null;
  const clientOrg: Organization | null = selectedProject?.client_organization_id
    ? (organizations.find(o => o.id === selectedProject.client_organization_id) ?? null)
    : null;

  // Pre-fill override fields when org is resolved
  useEffect(() => {
    if (!clientOrg) return;
    setOverrideName(clientOrg.name_invoice || clientOrg.name);
    setOverrideStreet(clientOrg.street_invoice || clientOrg.street || '');
    setOverrideZip(clientOrg.zip_invoice || clientOrg.zip || '');
    setOverrideCity(clientOrg.city_invoice || clientOrg.city || '');
    setOverrideCountry(clientOrg.country_invoice || clientOrg.country || '');
  }, [clientOrg?.id]);

  const reset = () => {
    setProjectId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddressOverride(false);
    setOverrideName('');
    setOverrideStreet('');
    setOverrideZip('');
    setOverrideCity('');
    setOverrideCountry('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Use override if shown, otherwise use org address directly
      const recipientName = showAddressOverride
        ? overrideName
        : (clientOrg?.name_invoice || clientOrg?.name) ?? null;
      const recipientStreet = showAddressOverride
        ? overrideStreet
        : (clientOrg?.street_invoice || clientOrg?.street) ?? null;
      const recipientZip = showAddressOverride
        ? overrideZip
        : (clientOrg?.zip_invoice || clientOrg?.zip) ?? null;
      const recipientCity = showAddressOverride
        ? overrideCity
        : (clientOrg?.city_invoice || clientOrg?.city) ?? null;
      const recipientCountry = showAddressOverride
        ? overrideCountry
        : (clientOrg?.country_invoice || clientOrg?.country) ?? null;

      const created = await addInvoice({
        invoice_number: nextNumber,
        status: InvoiceStatus.Draft,
        project_id: projectId,
        date,
        due_date: dueDateFrom(date),
        recipient_name: recipientName || null,
        recipient_street: recipientStreet || null,
        recipient_zip: recipientZip || null,
        recipient_city: recipientCity || null,
        recipient_country: recipientCountry || null,
        reference: selectedProject?.project_number ?? null,
        // Drafts may follow the current app language until finalized.
        // Finalization (mark as sent) elsewhere should freeze this value.
        document_language: appLocale === 'de' || appLocale === 'en' ? appLocale : null,
      });

      reset();
      onOpenChange(false);
      if (created && onCreated) onCreated(created);
    } catch (err) {
      console.error('Error adding invoice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const orgAddressPreview = clientOrg
    ? [
        clientOrg.name_invoice || clientOrg.name,
        clientOrg.street_invoice || clientOrg.street,
        [clientOrg.zip_invoice || clientOrg.zip, clientOrg.city_invoice || clientOrg.city]
          .filter(Boolean).join(' '),
        clientOrg.country_invoice || clientOrg.country,
      ].filter(Boolean).join(', ')
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold">{t('newInvoice')}</DialogTitle>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {nextNumber}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">{t('fields.date')}</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-7 text-xs"
              required
            />
          </div>

          <div className="space-y-0.5">
            <Label className="text-[10px] text-gray-500">{t('fields.project')}</Label>
            <SearchableSelect
              options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
              value={projectId}
              onChange={setProjectId}
              placeholder={`${tCommon('search')}…`}
            />
          </div>

          {clientOrg && !showAddressOverride && (
            <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 space-y-0.5">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('fields.recipientName')}</div>
              <div className="text-xs text-gray-700 dark:text-gray-300">{orgAddressPreview}</div>
              <button
                type="button"
                onClick={() => setShowAddressOverride(true)}
                className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 mt-0.5"
              >
                <ChevronDown className="h-3 w-3" />
                {tCommon('edit')}
              </button>
            </div>
          )}

          {showAddressOverride && (
            <div className="rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">{t('fields.recipientName')}</div>
                <button
                  type="button"
                  onClick={() => setShowAddressOverride(false)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                >
                  <ChevronUp className="h-3 w-3" />
                  {tCommon('cancel')}
                </button>
              </div>
              <Input
                value={overrideName}
                onChange={e => setOverrideName(e.target.value)}
                placeholder={t('fields.recipientName')}
                className="h-7 text-xs"
              />
              <Input
                value={overrideStreet}
                onChange={e => setOverrideStreet(e.target.value)}
                placeholder={t('fields.recipientStreet')}
                className="h-7 text-xs"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={overrideZip}
                  onChange={e => setOverrideZip(e.target.value)}
                  placeholder={t('fields.recipientZip')}
                  className="h-7 text-xs"
                />
                <Input
                  value={overrideCity}
                  onChange={e => setOverrideCity(e.target.value)}
                  placeholder={t('fields.recipientCity')}
                  className="h-7 text-xs col-span-2"
                />
              </div>
              <Input
                value={overrideCountry}
                onChange={e => setOverrideCountry(e.target.value)}
                placeholder={t('fields.recipientCountry')}
                className="h-7 text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { reset(); onOpenChange(false); }}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={isSubmitting}>
              {isSubmitting ? `${tCommon('saving')}` : t('addInvoice')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
