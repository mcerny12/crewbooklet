'use client';

import { useState } from 'react';
import { usePeopleStore } from '@/lib/stores/people-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const jobTypeNames = useJobTypesStore(s => s.jobTypeNames);
  const jobOptions = jobTypeNames.map(j => ({ value: j, label: j }));
  const languageOptions = Object.values(Language).map(l => ({ value: l, label: l }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-semibold">Add Person</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Row 1: Name + Email + Phone */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required disabled={isSubmitting} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="john@example.com" disabled={isSubmitting} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Mobile Phone</Label>
              <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} type="tel" placeholder="+49 123 456 789" disabled={isSubmitting} className="h-7 text-xs" />
            </div>
          </div>

          {/* Row 2: Jobs + Languages */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Jobs / Roles (up to 3)</Label>
              <MultiSelect options={jobOptions} selected={jobs} onChange={setJobs} placeholder="Select jobs…" maxSelections={3} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Languages</Label>
              <MultiSelect options={languageOptions} selected={languages} onChange={setLanguages} placeholder="Select languages…" />
            </div>
          </div>

          {/* Row 3: City + Country */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Berlin" disabled={isSubmitting} className="h-7 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-gray-500">Country</Label>
              <SearchableSelect
                options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
                value={country || null}
                onChange={(v) => setCountry(v ?? '')}
                placeholder="Search country..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Adding…' : 'Add Person'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
