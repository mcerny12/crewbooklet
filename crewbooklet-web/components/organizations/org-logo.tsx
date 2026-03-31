'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import type { Organization } from '@/lib/types/models';

export function getOrgDomain(organization: Organization): string | null {
  if (organization.website) {
    try {
      const url = organization.website.startsWith('http') ? organization.website : `https://${organization.website}`;
      return new URL(url).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }
  }
  if (organization.contact_email) {
    const parts = organization.contact_email.split('@');
    if (parts.length === 2 && parts[1]) return parts[1];
  }
  return null;
}


// Two sources tried in order: Google favicon (reliable) → DuckDuckGo
function getSources(domain: string): string[] {
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

interface OrgLogoProps {
  organization: Organization;
  size?: 'sm' | 'md';
}

export function OrgLogo({ organization, size = 'sm' }: OrgLogoProps) {
  const domain = getOrgDomain(organization);
  const sources = domain ? getSources(domain) : [];
  const [srcIndex, setSrcIndex] = useState(0);

  const dim = size === 'md' ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[10px]';
  const currentSrc = sources[srcIndex];

  if (currentSrc) {
    return (
      <img
        src={currentSrc}
        alt=""
        className={`${dim} rounded object-contain shrink-0 bg-white border border-gray-100 dark:border-gray-700`}
        onError={() => setSrcIndex(i => i + 1)}
      />
    );
  }

  const iconDim = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';
  return (
    <div className={`${dim} rounded flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-400`}>
      <Globe className={iconDim} />
    </div>
  );
}
