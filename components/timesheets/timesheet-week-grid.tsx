'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { parseISO, format, addDays } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Bundesland is derived in the background from place_of_work and stored on the entry
// for holiday detection (§ 5.6.1 TV FFS). It is never shown as a UI column.
import { cn } from '@/lib/utils';
import { computeTimesheetWeekResult, formatEuroCents } from '@/lib/timesheets/week-result';
import { deriveBundesland } from '@/lib/timesheets/location';
import type { Timesheet, TimesheetEntry, PerDiemType, DayResult } from '@/lib/timesheets/types';


interface Props {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
  onEntryChange: (date: string, field: keyof TimesheetEntry, value: unknown) => void;
  isLoading?: boolean;
}

function cellCn(extraClass?: string) {
  return cn('h-7 text-xs border border-border/60 rounded px-1.5', extraClass);
}

export function TimesheetWeekGrid({ timesheet, entries, onEntryChange, isLoading }: Props) {
  const t = useTranslations('timesheets');
  const tPD = useTranslations('timesheets.perDiemType');
  const tDailyMin = useTranslations('timesheets.dailyMinOverride');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  const monday = parseISO(timesheet.week_start);

  const getEntry = useCallback((date: string): Partial<TimesheetEntry> => {
    return entries.find(e => e.entry_date === date) ?? {};
  }, [entries]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(monday, i), 'yyyy-MM-dd');
    const label = format(addDays(monday, i), 'EEEE d. MMM', { locale: dateLocale });
    return { date, label };
  });

  // Compute per-day totals for the Pay column (Bug #6).
  // dayResultMap maps date → DayResult (only worked days have meaningful dayTotalCents).
  const dayResultMap = useMemo((): Record<string, DayResult> => {
    const computed = computeTimesheetWeekResult(timesheet, entries);
    if (!computed) return {};
    const map: Record<string, DayResult> = {};
    for (const dr of computed.result.days) {
      map[dr.date] = dr;
    }
    return map;
  }, [timesheet, entries]);

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t('title')}…</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-245">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-36">{t('day.day')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.workStart')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.workEnd')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.break')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.travelTo')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.travelBack')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.dailyMin')}</th>
            <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-32">{t('day.placeOfWork')}</th>
            {timesheet.per_diem_enabled && (
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('day.perDiem')}</th>
            )}
            <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-24">{t('day.earnings')}</th>
          </tr>
        </thead>
        <tbody>
          {days.map(({ date, label }) => {
            const entry = getEntry(date);
            const isWeekend = date === format(addDays(monday, 5), 'yyyy-MM-dd') ||
              date === format(addDays(monday, 6), 'yyyy-MM-dd');
            const dr = dayResultMap[date];
            const hasEntry = !!(entry.work_start || entry.work_end);

            return (
              <tr
                key={date}
                className={cn(
                  'border-b transition-colors hover:bg-muted/20',
                  isWeekend && 'bg-slate-50',
                  dr?.restViolationMinutes ? 'border-l-2 border-l-amber-400' : '',
                )}
              >
                {/* Day label */}
                <td className={cn('px-3 py-2 font-medium', isWeekend && 'text-muted-foreground')}>
                  {label}
                </td>

                {/* Work start */}
                <td className="px-2 py-1.5 text-center">
                  <Input
                    type="time"
                    value={entry.work_start ?? ''}
                    onChange={e => onEntryChange(date, 'work_start', e.target.value || null)}
                    className={cellCn('w-24')}
                  />
                </td>

                {/* Work end */}
                <td className="px-2 py-1.5 text-center">
                  <Input
                    type="time"
                    value={entry.work_end ?? ''}
                    onChange={e => onEntryChange(date, 'work_end', e.target.value || null)}
                    className={cellCn('w-24')}
                  />
                </td>

                {/* Break */}
                <td className="px-2 py-1.5 text-center">
                  <Input
                    type="number"
                    min="0"
                    step="15"
                    value={entry.break_minutes ?? 0}
                    onChange={e => onEntryChange(date, 'break_minutes', parseInt(e.target.value) || 0)}
                    className={cellCn('w-16 text-right')}
                  />
                </td>

                {/* Travel to */}
                <td className="px-2 py-1.5 text-center">
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={entry.travel_to_minutes ?? 0}
                    onChange={e => onEntryChange(date, 'travel_to_minutes', parseInt(e.target.value) || 0)}
                    className={cellCn('w-16 text-right')}
                  />
                </td>

                {/* Travel back */}
                <td className="px-2 py-1.5 text-center">
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={entry.travel_back_minutes ?? 0}
                    onChange={e => onEntryChange(date, 'travel_back_minutes', parseInt(e.target.value) || 0)}
                    className={cellCn('w-16 text-right')}
                  />
                </td>

                {/* Daily minimum override: inherit timesheet default, or force on/off for this day */}
                <td className="px-2 py-1.5 text-center">
                  <Select
                    value={entry.daily_minimum_override === true ? 'on' : entry.daily_minimum_override === false ? 'off' : 'inherit'}
                    onValueChange={v => onEntryChange(date, 'daily_minimum_override', v === 'inherit' ? null : v === 'on')}
                  >
                    <SelectTrigger className={cellCn('w-20 mx-auto')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">{tDailyMin('inherit')}</SelectItem>
                      <SelectItem value="on">{tDailyMin('on')}</SelectItem>
                      <SelectItem value="off">{tDailyMin('off')}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* Place of work — Bug #8: auto-derive Bundesland on change */}
                <td className="px-2 py-1.5">
                  <Input
                    value={entry.place_of_work ?? ''}
                    onChange={e => {
                      const place = e.target.value || null;
                      onEntryChange(date, 'place_of_work', place);
                      // Always derive Bundesland from place of work for background holiday detection.
                      // Clears to null when place is unknown or empty.
                      onEntryChange(date, 'bundesland', place ? deriveBundesland(place) : null);
                    }}
                    className={cellCn('w-32')}
                    placeholder="Berlin"
                  />
                </td>

                {/* Per diem — column hidden entirely when per_diem_enabled is off */}
                {timesheet.per_diem_enabled && (
                  <td className="px-2 py-1.5">
                    <Select
                      value={entry.per_diem_type ?? 'auto'}
                      onValueChange={v => onEntryChange(date, 'per_diem_type', v as PerDiemType)}
                    >
                      <SelectTrigger className={cellCn('w-36')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{tPD('auto')}</SelectItem>
                        <SelectItem value="partial">{tPD('partial')}</SelectItem>
                        <SelectItem value="full">{tPD('full')}</SelectItem>
                        <SelectItem value="none">{tPD('none')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                )}

                {/* Per-day pay (Bug #6): shown only for days with an entry; includes
                    base pay + daily OT + day-type surcharges + per diem for that day.
                    An amber left-border indicates a rest-period violation after this day. */}
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {hasEntry && dr?.isWorked ? (
                    <span className={cn(
                      'font-medium text-xs',
                      dr.restViolationMinutes > 0 && 'text-amber-600',
                    )}>
                      {formatEuroCents(dr.dayTotalCents)}
                      {dr.restViolationMinutes > 0 && (
                        <span className="ml-1 text-[10px] text-amber-500" title={t('day.restViolation')}>⚠</span>
                      )}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
