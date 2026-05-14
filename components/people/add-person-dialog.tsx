'use client';

import { useState, useMemo } from 'react';
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
}

export function AddPersonDialog({ open, onOpenChange }: AddPersonDialogProps) {
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
      await addPerson({
        name: name.trim(),
        email: email || null,
        mobile_phone: mobilePhone || null,
        jobs: jobs,
        languages: languages as Language[],
        address: (city || country) ? { city: city || null, country: country || null } : null,
        notes: null,
      });
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
          <DialogTitle className="text-sm font-semibold">Add Person</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* Name — full width always */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required disabled={isSubmitting} className="h-9 text-sm" />
            </div>

            {/* Email + Phone — stack on mobile, side-by-side on sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="john@example.com" disabled={isSubmitting} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} type="tel" placeholder="+49 123 456 789" disabled={isSubmitting} className="h-9 text-sm" />
              </div>
            </div>

            {/* Jobs + Languages — stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Jobs / Roles (up to 3)</label>
                <MultiSelect options={jobOptions} selected={jobs} onChange={setJobs} placeholder="Select jobs…" maxSelections={3} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Languages</label>
                <MultiSelect options={languageOptions} selected={languages} onChange={setLanguages} placeholder="Select languages…" />
              </div>
            </div>

            {/* City + Country — stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Berlin" disabled={isSubmitting} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Country</label>
                <SearchableSelect
                  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
                  value={country || null}
                  onChange={(v) => setCountry(v ?? '')}
                  placeholder="Search country..."
                />
              </div>
            </div>

          </div>

          {/* Sticky footer */}
          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t bg-background">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-9" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Adding…' : 'Add Person'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
