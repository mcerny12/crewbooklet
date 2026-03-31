'use client';

import { useState } from 'react';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [street, setStreet] = useState('');
  const [street2, setStreet2] = useState('');
  const [zip, setZip] = useState('');
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
    setStreet('');
    setStreet2('');
    setZip('');
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
        street: street || null,
        street2: street2 || null,
        zip: zip || null,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm font-semibold">Add Organization</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">

            {/* Left column: identity + contact */}
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Organization Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Company Inc." required disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Type</Label>
                <SearchableSelect
                  options={Object.values(OrganizationJobType).map(t => ({ id: t, label: t }))}
                  value={jobType || null}
                  onChange={(v) => setJobType(v ?? '')}
                  placeholder="Search type..."
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Email</Label>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="contact@company.com" disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} type="tel" placeholder="+1 234 567 8900" disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Website</Label>
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
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Right column: address + notes */}
            <div className="space-y-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Street</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main Street" disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Street 2</Label>
                <Input value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Suite 100" disabled={isSubmitting} className="h-7 text-xs" />
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-1.5">
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">ZIP</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="12345" disabled={isSubmitting} className="h-7 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] text-gray-500">City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Los Angeles" disabled={isSubmitting} className="h-7 text-xs" />
                </div>
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

              <div className="space-y-0.5">
                <Label className="text-[10px] text-gray-500">Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" rows={3} disabled={isSubmitting} className="text-xs resize-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { resetForm(); onOpenChange(false); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
