'use client';

import type { Organization } from '@/lib/types/models';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import { OrgLogo } from './org-logo';

interface CompactOrganizationListItemProps {
  organization: Organization;
  onSelect: (org: Organization) => void;
  isSelected: boolean;
}

export function CompactOrganizationListItem({ organization, onSelect, isSelected }: CompactOrganizationListItemProps) {
  const primaryJob = organization.jobs && organization.jobs.length > 0 ? organization.jobs[0] : null;

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (organization.contact_email) window.location.href = `mailto:${organization.contact_email}`;
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (organization.contact_phone) window.location.href = `tel:${organization.contact_phone}`;
  };

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (organization.website) window.open(organization.website, '_blank');
  };

  return (
    <div
      className={`grid grid-cols-[24px_2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer transition-colors items-center text-sm border-b ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
      onClick={() => onSelect(organization)}
    >
      {/* Logo */}
      <OrgLogo organization={organization} size="sm" />

      {/* Name & Type */}
      <div className="min-w-0">
        <div className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>{organization.name}</div>
        {primaryJob && <div className="text-xs text-gray-500 truncate">{primaryJob}</div>}
      </div>

      {/* Email */}
      <div className="min-w-0">
        {organization.contact_email ? (
          <button onClick={handleEmailClick} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate w-full" title={organization.contact_email}>
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate text-xs">{organization.contact_email}</span>
          </button>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>

      {/* Phone */}
      <div className="min-w-0">
        {organization.contact_phone ? (
          <button onClick={handlePhoneClick} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate w-full" title={organization.contact_phone}>
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate text-xs">{organization.contact_phone}</span>
          </button>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>

      {/* Website */}
      <div className="min-w-0">
        {organization.website ? (
          <button onClick={handleWebsiteClick} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate w-full" title={organization.website}>
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate text-xs">{organization.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
          </button>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>

      {/* City & Country */}
      <div className="min-w-0">
        {organization.city ? (
          <div className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate text-xs">{organization.city}{organization.country ? `, ${organization.country}` : ''}</span>
          </div>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>
    </div>
  );
}
