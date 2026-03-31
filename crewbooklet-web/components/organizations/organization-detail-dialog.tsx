'use client';

import type { Organization } from '@/lib/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Globe, MapPin, FileText, Building2 } from 'lucide-react';

interface OrganizationDetailDialogProps {
  organization: Organization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationDetailDialog({ organization, open, onOpenChange }: OrganizationDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {organization.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
              Contact Information
            </h3>
            <div className="space-y-2">
              {organization.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${organization.contact_email}`} className="hover:underline">
                    {organization.contact_email}
                  </a>
                </div>
              )}
              {organization.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${organization.contact_phone}`} className="hover:underline">
                    {organization.contact_phone}
                  </a>
                </div>
              )}
              {organization.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {organization.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Primary Address */}
          {(organization.street || organization.city) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                  Primary Address
                </h3>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    {organization.street && <div>{organization.street}</div>}
                    {organization.street2 && <div>{organization.street2}</div>}
                    <div>
                      {organization.zip && `${organization.zip} `}
                      {organization.city}
                    </div>
                    {organization.country && <div>{organization.country}</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Invoice Address */}
          {(organization.street_invoice || organization.city_invoice) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                  Invoice Address
                </h3>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    {organization.name_invoice && <div className="font-medium">{organization.name_invoice}</div>}
                    {organization.street_invoice && <div>{organization.street_invoice}</div>}
                    {organization.street2_invoice && <div>{organization.street2_invoice}</div>}
                    <div>
                      {organization.zip_invoice && `${organization.zip_invoice} `}
                      {organization.city_invoice}
                    </div>
                    {organization.country_invoice && <div>{organization.country_invoice}</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Jobs/Services */}
          {organization.jobs && organization.jobs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                  Services
                </h3>
                <div className="flex flex-wrap gap-2">
                  {organization.jobs.map((job, index) => (
                    <Badge key={index} variant="secondary">
                      {job}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {organization.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{organization.notes}</p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="text-xs text-gray-500">
            <div>Created: {new Date(organization.created_at).toLocaleDateString()}</div>
            <div>Last Updated: {new Date(organization.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
