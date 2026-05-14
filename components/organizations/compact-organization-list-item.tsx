'use client';

import type { Organization } from '@/lib/types/models';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import { OrgLogo } from './org-logo';
import { cn } from '@/lib/utils';

interface CompactOrganizationListItemProps {
  organization: Organization;
  onSelect: (org: Organization) => void;
  isSelected: boolean;
}

export function CompactOrganizationListItem({
  organization,
  onSelect,
  isSelected,
}: CompactOrganizationListItemProps) {
  const primaryJob = organization.jobs?.[0] ?? null;

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
    <>
      {/* ── MOBILE CARD (< 768px) ── */}
      <div
        role="row"
        aria-selected={isSelected}
        onClick={() => onSelect(organization)}
        className={cn(
          'flex md:hidden flex-col gap-2.5 px-4 py-3 cursor-pointer border-b transition-colors',
          isSelected ? 'list-row-selected' : 'hover:bg-muted/40',
        )}
      >
        {/* Top row: logo + name + primaryJob */}
        <div className="flex items-center gap-2.5">
          <OrgLogo organization={organization} size="sm" />
          <div className="min-w-0 flex-1">
            <div className={cn('font-medium mobile-truncate text-[13.5px]', isSelected && 'text-primary')}>{organization.name}</div>
            {primaryJob && <div className="text-xs text-muted-foreground truncate">{primaryJob}</div>}
          </div>
        </div>

        {/* Secondary rows indented under logo */}
        <div className="pl-10 flex flex-col gap-1">
          {organization.contact_email && (
            <button
              onClick={handleEmailClick}
              className="flex items-center gap-1.5 text-primary hover:underline text-[12.5px] min-h-10 w-full text-left"
              title={organization.contact_email}
            >
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              <span className="mobile-truncate">{organization.contact_email}</span>
            </button>
          )}
          {organization.contact_phone && (
            <button
              onClick={handlePhoneClick}
              className="flex items-center gap-1.5 text-primary hover:underline text-[12.5px] min-h-10 w-full text-left"
              title={organization.contact_phone}
            >
              <Phone className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{organization.contact_phone}</span>
            </button>
          )}
          {organization.website && (
            <button
              onClick={handleWebsiteClick}
              className="flex items-center gap-1.5 text-primary hover:underline text-[12.5px] min-h-10 w-full text-left"
              title={organization.website}
            >
              <Globe className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{organization.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </button>
          )}
          {organization.city && (
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground min-h-10">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
              <span className="truncate">{organization.city}{organization.country ? `, ${organization.country}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP ROW (≥ 768px) ── */}
      <div
        role="row"
        aria-selected={isSelected}
        onClick={() => onSelect(organization)}
        className={cn(
          'hidden md:grid items-center gap-3 px-5 py-3 cursor-pointer border-b transition-colors',
          'grid-cols-[28px_2fr_1.5fr_1fr_1fr_1fr]',
          isSelected
            ? 'list-row-selected'
            : 'hover:bg-muted/40',
        )}
      >
        {/* Logo */}
        <OrgLogo organization={organization} size="sm" />

        {/* Name & type */}
        <div className="min-w-0">
          <div className={cn('font-medium truncate text-[13.5px]', isSelected && 'text-primary')}>{organization.name}</div>
          {primaryJob && <div className="text-xs text-muted-foreground truncate">{primaryJob}</div>}
        </div>

        {/* Email */}
        <div className="min-w-0">
          {organization.contact_email ? (
            <button
              onClick={handleEmailClick}
              className="flex items-center gap-1 text-primary hover:underline truncate w-full text-[12.5px]"
              title={organization.contact_email}
            >
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{organization.contact_email}</span>
            </button>
          ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
        </div>

        {/* Phone */}
        <div className="min-w-0">
          {organization.contact_phone ? (
            <button
              onClick={handlePhoneClick}
              className="flex items-center gap-1 text-primary hover:underline truncate w-full text-[12.5px]"
              title={organization.contact_phone}
            >
              <Phone className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{organization.contact_phone}</span>
            </button>
          ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
        </div>

        {/* Website */}
        <div className="min-w-0">
          {organization.website ? (
            <button
              onClick={handleWebsiteClick}
              className="flex items-center gap-1 text-primary hover:underline truncate w-full text-[12.5px]"
              title={organization.website}
            >
              <Globe className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{organization.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
            </button>
          ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
        </div>

        {/* Location */}
        <div className="min-w-0">
          {organization.city ? (
            <div className="flex items-center gap-1 truncate text-[12.5px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
              <span className="truncate">{organization.city}{organization.country ? `, ${organization.country}` : ''}</span>
            </div>
          ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
        </div>
      </div>
    </>
  );
}
