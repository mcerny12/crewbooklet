'use client';

import type { Person } from '@/lib/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, MapPin, Globe, Briefcase, Languages } from 'lucide-react';

interface PersonDetailDialogProps {
  person: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonDetailDialog({ person, open, onOpenChange }: PersonDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{person.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
              Contact Information
            </h3>
            <div className="space-y-2">
              {person.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${person.email}`} className="hover:underline">
                    {person.email}
                  </a>
                </div>
              )}
              {person.mobile_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${person.mobile_phone}`} className="hover:underline">
                    {person.mobile_phone}
                  </a>
                </div>
              )}
              {person.work_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>Work: {person.work_phone}</span>
                </div>
              )}
              {person.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a
                    href={person.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {person.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {person.address && !isAddressEmpty(person.address) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                  Address
                </h3>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    {person.address.street1 && <div>{person.address.street1}</div>}
                    {person.address.street2 && <div>{person.address.street2}</div>}
                    <div>
                      {person.address.zip && `${person.address.zip} `}
                      {person.address.city}
                    </div>
                    {person.address.country && <div>{person.address.country}</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Jobs */}
          {person.jobs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Positions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {person.jobs.map((job, index) => (
                    <Badge key={index} variant="secondary">
                      {job}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Languages */}
          {person.languages.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {person.languages.map((lang, index) => (
                    <Badge key={index} variant="outline">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {person.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isAddressEmpty(address: Person['address']): boolean {
  if (!address) return true;
  return ![address.street1, address.street2, address.zip, address.city, address.country]
    .some(val => val && val.trim().length > 0);
}
