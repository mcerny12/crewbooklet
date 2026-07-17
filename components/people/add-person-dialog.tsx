'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePeopleStore } from '@/lib/stores/people-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Language, FILM_COUNTRIES } from '@/lib/types/models';
import { useJobTypesStore } from '@/lib/stores/job-types-store';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string | null;
  onCreated?: (personId: string) => void;
}

export function AddPersonDialog({ open, onOpenChange, organizationId, onCreated }: AddPersonDialogProps) {
  const t = useTranslations('people');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [jobs, setJobs] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPerson = usePeopleStore(state => state.addPerson);

  const resetForm = () => {
    setName('');
    setEmail('');
    setMobilePhone('');
    setJobs([]);
    setLanguages([]);
    setCity('');
    setCountry('');
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await addPerson({
        name: name.trim(),
        email: email || null,
        mobile_phone: mobilePhone || null,
        jobs: jobs,
        languages: languages as Language[],
        address: (city || country) ? { city: city || null, country: country || null } : null,
        notes: null,
        organization_id: organizationId ?? null,
      });
      if (created && onCreated) onCreated(created.id);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding person:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const jobTypes = useJobTypesStore(s => s.jobTypes);
  const jobOptions = useMemo(() => jobTypes.map(j => ({ value: j.name, label: j.name })), [jobTypes]);
  const languageOptions = Object.values(Language).map(l => ({ value: l, label: l }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="w-full max-w-lg sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold">{t('addPersonTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('fields.name')} *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('fields.namePlaceholder')} required disabled={isSubmitting} className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('fields.email')}</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t('fields.email')} disabled={isSubmitting} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('fields.mobilePhone')}</label>
                <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} type="tel" placeholder={t('fields.mobilePhone')} disabled={isSubmitting} className="h-9 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('fields.jobs')}</label>
                <MultiSelect options={jobOptions} selected={jobs} onChange={setJobs} placeholder={t('fields.selectJob')} maxSelections={3} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('fields.languages')}</label>
                <MultiSelect options={languageOptions} selected={languages} onChange={setLanguages} placeholder={tCommon('selectPlaceholder')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('fields.city')}</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('fields.city')} disabled={isSubmitting} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('fields.country')}</label>
                <SearchableSelect
                  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))} showOptionsWhenEmpty
                  value={country || null}
                  onChange={(v) => setCountry(v ?? '')}
                  placeholder={`${tCommon('search')}…`}
                />
              </div>
            </div>

          </div>

          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t bg-background">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" size="sm" className="h-9" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? `${tCommon('saving')}` : t('addPerson')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
