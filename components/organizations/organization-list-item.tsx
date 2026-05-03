'use client';

import { useState } from 'react';
import type { Organization } from '@/lib/types/models';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Globe } from 'lucide-react';
import { OrganizationDetailDrawer } from './organization-detail-drawer';
import { OrgLogo } from './org-logo';

interface OrganizationListItemProps {
  organization: Organization;
  onClick?: () => void;
}

export function OrganizationListItem({ organization, onClick }: OrganizationListItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsDetailOpen(true);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b last:border-b-0"
      >
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <OrgLogo organization={organization} size="md" />
          <h3 className="font-semibold text-base">{organization.name}</h3>
          {organization.jobs && organization.jobs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {organization.jobs[0]}
              {organization.jobs.length > 1 && ` +${organization.jobs.length - 1}`}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
          {organization.contact_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {organization.contact_email}
            </span>
          )}
          {organization.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {organization.contact_phone}
            </span>
          )}
          {organization.website && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {organization.website}
            </span>
          )}
        </div>

        {organization.city && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            📍 {organization.city}
            {organization.country && `, ${organization.country}`}
          </p>
        )}
      </div>
    </div>

    <OrganizationDetailDrawer
      organization={organization}
      open={isDetailOpen}
      onOpenChange={setIsDetailOpen}
    />
  </>
  );
}
