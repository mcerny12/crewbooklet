'use client';

import type { Person } from '@/lib/types/models';
import { Mail, Phone, MapPin } from 'lucide-react';

interface CompactPersonListItemProps {
  person: Person;
  onSelect: (person: Person) => void;
  isSelected: boolean;
}

export function CompactPersonListItem({ person, onSelect, isSelected }: CompactPersonListItemProps) {
  const primaryJob = person.jobs && person.jobs.length > 0 ? person.jobs[0] : null;

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (person.email) window.location.href = `mailto:${person.email}`;
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (person.mobile_phone) window.location.href = `tel:${person.mobile_phone}`;
  };

  return (
    <div
      className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer transition-colors items-center text-sm border-b ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
      onClick={() => onSelect(person)}
    >
      {/* Name & Position */}
      <div className="min-w-0">
        <div className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>{person.name}</div>
        {primaryJob && <div className="text-xs text-gray-500 truncate">{primaryJob}</div>}
      </div>

      {/* Email */}
      <div className="min-w-0">
        {person.email ? (
          <button onClick={handleEmailClick} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate w-full" title={person.email}>
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate text-xs">{person.email}</span>
          </button>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>

      {/* Phone */}
      <div className="min-w-0">
        {person.mobile_phone ? (
          <button onClick={handlePhoneClick} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate w-full" title={person.mobile_phone}>
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate text-xs">{person.mobile_phone}</span>
          </button>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>

      {/* City */}
      <div className="min-w-0">
        {person.address?.city ? (
          <div className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate text-xs">{person.address.city}</span>
          </div>
        ) : <span className="text-xs text-gray-400">—</span>}
      </div>

      {/* Country */}
      <div className="min-w-0 truncate text-xs text-gray-500">
        {person.address?.country || '—'}
      </div>
    </div>
  );
}
