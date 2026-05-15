'use client';

import type { Person } from '@/lib/types/models';
import { Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactPersonListItemProps {
  person: Person;
  onSelect: (person: Person) => void;
  isSelected: boolean;
}

function avatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function CompactPersonListItem({ person, onSelect, isSelected }: CompactPersonListItemProps) {
  const primaryJob = person.jobs?.[0] ?? null;

  const handleEmailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (person.email) window.location.href = `mailto:${person.email}`;
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (person.mobile_phone) window.location.href = `tel:${person.mobile_phone}`;
  };

  return (
    <>
      {/* ── Mobile card (< 768px) ── */}
      <div
        role="row"
        aria-selected={isSelected}
        onClick={() => onSelect(person)}
        className={cn(
          'flex md:hidden items-center gap-3 px-4 py-2.5 cursor-pointer border-b transition-colors',
          isSelected ? 'list-row-selected' : 'hover:bg-muted/40',
        )}
        data-cb-component="CompactPersonListItem"
        data-cb-entity="person"
      >
        {/* Avatar */}
        <div
          aria-hidden
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            avatarColor(person.name),
          )}
        >
          {initials(person.name)}
        </div>

        {/* Name + secondary info */}
        <div className="min-w-0 flex-1">
          <div className={cn('font-semibold text-[13px] truncate leading-tight', isSelected && 'text-primary')}>
            {person.name}
          </div>
          <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
            {[
              primaryJob,
              person.email,
              person.address?.city,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* Phone icon tap target */}
        {person.mobile_phone ? (
          <button
            onClick={handlePhoneClick}
            aria-label={`Call ${person.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : person.email ? (
          <button
            onClick={handleEmailClick}
            aria-label={`Email ${person.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-muted"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* ── Desktop grid row (≥ 768px) ── */}
      <div
        role="row"
        aria-selected={isSelected}
        onClick={() => onSelect(person)}
        className={cn(
          'hidden md:grid items-center gap-3 px-5 py-3 cursor-pointer border-b transition-colors',
          'grid-cols-[32px_2fr_1.5fr_1fr_1fr_1fr]',
          isSelected ? 'list-row-selected' : 'hover:bg-muted/40',
        )}
        data-cb-component="CompactPersonListItem"
        data-cb-entity="person"
      >
        <div
          aria-hidden
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            avatarColor(person.name),
          )}
        >
          {initials(person.name)}
        </div>

        <div className="min-w-0">
          <div className={cn('font-medium truncate text-[13.5px]', isSelected && 'text-primary')}>{person.name}</div>
          {primaryJob && <div className="truncate text-xs text-muted-foreground">{primaryJob}</div>}
        </div>

        <div className="min-w-0">
          {person.email ? (
            <button
              onClick={handleEmailClick}
              className="flex items-center gap-1 text-primary hover:underline truncate w-full text-[12.5px]"
              title={person.email}
            >
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{person.email}</span>
            </button>
          ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
        </div>

        <div className="min-w-0">
          {person.mobile_phone ? (
            <button
              onClick={handlePhoneClick}
              className="flex items-center gap-1 text-primary hover:underline truncate w-full text-[12.5px]"
              title={person.mobile_phone}
            >
              <Phone className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{person.mobile_phone}</span>
            </button>
          ) : <span className="text-[12.5px] text-muted-foreground/50">—</span>}
        </div>

        <div className="min-w-0 truncate text-[12.5px] text-muted-foreground">
          {person.address?.city || '—'}
        </div>

        <div className="truncate text-[12.5px] text-muted-foreground">
          {person.address?.country || '—'}
        </div>
      </div>
    </>
  );
}
