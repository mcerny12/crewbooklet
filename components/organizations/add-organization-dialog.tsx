'use client';

import { useState } from 'react';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { OrganizationJobType, FILM_COUNTRIES } from '@/lib/types/models';

interface AddOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddOrganizationDialog({ open, onOpenChange }: AddOrganizationDialogProps) {
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [jobType, setJobType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOrganization = useOrganizationsStore(state => state.addOrganization);

  const resetForm = () => {
    setName('');
    setContactEmail('');
    setContactPhone('');
    setWebsite('');
    setCity('');
    setCountry('');
    setJobType('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addOrganization({
        name,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        street: null,
        street2: null,
        zip: null,
        city: city || null,
        country: country || null,
        jobs: jobType ? [jobType as OrganizationJobType] : [],
        notes: notes || null,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding organization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="w-full max-w-lg sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold">Add Organization</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* Name — full width */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Organization Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Company Inc." required disabled={isSubmitting} className="h-9 text-sm" />
            </div>

            {/* Type — full width (SearchableSelect) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <SearchableSelect
                options={Object.values(OrganizationJobType).map(t => ({ id: t, label: t }))}
                value={jobType || null}
                onChange={(v) => setJobType(v ?? '')}
                placeholder="Search type..."
              />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="contact@company.com" disabled={isSubmitting} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} type="tel" placeholder="+1 234 567 8900" disabled={isSubmitting} className="h-9 text-sm" />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Website</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onBlur={() => {
                  const v = website.trim();
                  if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
                    setWebsite('https://' + v);
                  }
                }}
                placeholder="www.company.com"
                disabled={isSubmitting}
                className="h-9 text-sm"
              />
            </div>

            {/* City + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Los Angeles" disabled={isSubmitting} className="h-9 text-sm" />
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

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" rows={2} disabled={isSubmitting} className="text-sm resize-none rounded-lg" />
            </div>

          </div>

          {/* Sticky footer */}
          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t bg-background">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-9" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Adding…' : 'Add Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
