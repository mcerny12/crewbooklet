'use client';

import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { formatEuroCents } from '@/lib/timesheets/week-result';
import type { Timesheet, TimesheetStatus } from '@/lib/timesheets/types';

const STATUS_COLORS: Record<TimesheetStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
};

interface Props {
  timesheet: Timesheet;
  onSelect: (t: Timesheet) => void;
  isSelected?: boolean;
  /** This week's total pay, if computable (weekly_rate_cents set and entries loaded). */
  payCents?: number | null;
}

function formatWeekRange(weekStart: string, dateLocale: typeof de): string {
  try {
    const monday = parseISO(weekStart);
    const sunday = endOfWeek(monday, { weekStartsOn: 1 });
    return `${format(monday, 'd. MMM', { locale: dateLocale })} – ${format(sunday, 'd. MMM yyyy', { locale: dateLocale })}`;
  } catch {
    return weekStart;
  }
}

function weekNumber(weekStart: string, dateLocale: typeof de): string {
  try {
    const d = parseISO(weekStart);
    return format(startOfWeek(d, { weekStartsOn: 1 }), 'w', { locale: dateLocale });
  } catch {
    return '';
  }
}

export function CompactTimesheetListItem({ timesheet, onSelect, isSelected, payCents }: Props) {
  const t = useTranslations('timesheets');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  return (
    <div
      role="row"
      aria-selected={isSelected}
      onClick={() => onSelect(timesheet)}
      className={cn(
        'flex items-center gap-3 px-5 py-3 cursor-pointer border-b transition-colors',
        isSelected ? 'list-row-selected' : 'hover:bg-muted/40',
      )}
    >
      {/* Week number badge */}
      <div className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-muted text-center">
        <span className="text-[10px] text-muted-foreground leading-none">{t('weekAbbr')}</span>
        <span className="text-base font-bold leading-tight">{weekNumber(timesheet.week_start, dateLocale)}</span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold truncate', isSelected && 'text-primary')}>
            {formatWeekRange(timesheet.week_start, dateLocale)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {timesheet.person_name || '—'}
          {timesheet.position_title ? ` · ${timesheet.position_title}` : ''}
        </div>
      </div>

      {/* Pay at a glance (confidential — same visibility as the estimate panel) */}
      {payCents != null && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {formatEuroCents(payCents)}
        </span>
      )}

      {/* Status badge */}
      <span className={cn(
        'shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STATUS_COLORS[timesheet.status],
      )}>
        {t(`status.${timesheet.status}`)}
      </span>
    </div>
  );
}
