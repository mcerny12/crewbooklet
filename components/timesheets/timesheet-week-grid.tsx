'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { parseISO, format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Timesheet, TimesheetEntry, PerDiemType } from '@/lib/timesheets/types';

// Bundesland options (DE-ISO3166-2 codes)
const BUNDESLAENDER = [
  { code: 'DE-BB', label: 'Brandenburg' },
  { code: 'DE-BE', label: 'Berlin' },
  { code: 'DE-BW', label: 'Baden-Württemberg' },
  { code: 'DE-BY', label: 'Bayern' },
  { code: 'DE-HB', label: 'Bremen' },
  { code: 'DE-HE', label: 'Hessen' },
  { code: 'DE-HH', label: 'Hamburg' },
  { code: 'DE-MV', label: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', label: 'Niedersachsen' },
  { code: 'DE-NW', label: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', label: 'Rheinland-Pfalz' },
  { code: 'DE-SH', label: 'Schleswig-Holstein' },
  { code: 'DE-SL', label: 'Saarland' },
  { code: 'DE-SN', label: 'Sachsen' },
  { code: 'DE-ST', label: 'Sachsen-Anhalt' },
  { code: 'DE-TH', label: 'Thüringen' },
];

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

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

  const monday = parseISO(timesheet.week_start);

  const getEntry = useCallback((date: string): Partial<TimesheetEntry> => {
    return entries.find(e => e.entry_date === date) ?? {};
  }, [entries]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(monday, i), 'yyyy-MM-dd');
    const label = format(addDays(monday, i), 'EEEE d. MMM', { locale: de });
    const dayKey = DAY_KEYS[i];
    return { date, label, dayKey };
  });

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t('title')}…</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-36">Tag</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.workStart')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.workEnd')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.break')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.travelTo')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.travelBack')}</th>
            <th className="px-2 py-2 text-center font-semibold text-muted-foreground">{t('day.travelQualifies')}</th>
            <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-32">{t('day.placeOfWork')}</th>
            <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-40">{t('day.bundesland')}</th>
            <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('day.perDiem')}</th>
          </tr>
        </thead>
        <tbody>
          {days.map(({ date, label }) => {
            const entry = getEntry(date);
            const isWeekend = date === format(addDays(monday, 5), 'yyyy-MM-dd') ||
              date === format(addDays(monday, 6), 'yyyy-MM-dd');

            return (
              <tr
                key={date}
                className={cn(
                  'border-b transition-colors hover:bg-muted/20',
                  isWeekend && 'bg-slate-50',
                )}
              >
                {/* Day label */}
                <td className={cn('px-3 py-2 font-medium', isWeekend && 'text-muted-foreground')}>
                  {label}
                </td>

                {/* Work start */}
                <td className="px-2 py-1.5">
                  <Input
                    type="time"
                    value={entry.work_start ?? ''}
                    onChange={e => onEntryChange(date, 'work_start', e.target.value || null)}
                    className={cellCn('w-24')}
                  />
                </td>

                {/* Work end */}
                <td className="px-2 py-1.5">
                  <Input
                    type="time"
                    value={entry.work_end ?? ''}
                    onChange={e => onEntryChange(date, 'work_end', e.target.value || null)}
                    className={cellCn('w-24')}
                  />
                </td>

                {/* Break */}
                <td className="px-2 py-1.5">
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
                <td className="px-2 py-1.5">
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
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={entry.travel_back_minutes ?? 0}
                    onChange={e => onEntryChange(date, 'travel_back_minutes', parseInt(e.target.value) || 0)}
                    className={cellCn('w-16 text-right')}
                  />
                </td>

                {/* Travel qualifies checkbox */}
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={entry.travel_qualifies ?? false}
                    onChange={e => onEntryChange(date, 'travel_qualifies', e.target.checked)}
                    className="h-4 w-4 accent-primary"
                    aria-label={t('day.travelQualifies')}
                  />
                </td>

                {/* Place of work */}
                <td className="px-2 py-1.5">
                  <Input
                    value={entry.place_of_work ?? ''}
                    onChange={e => onEntryChange(date, 'place_of_work', e.target.value || null)}
                    className={cellCn('w-32')}
                    placeholder="Berlin"
                  />
                </td>

                {/* Bundesland */}
                <td className="px-2 py-1.5">
                  <Select
                    value={entry.bundesland ?? '__none__'}
                    onValueChange={v => onEntryChange(date, 'bundesland', v === '__none__' ? null : v)}
                  >
                    <SelectTrigger className={cellCn('w-40')}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {BUNDESLAENDER.map(bl => (
                        <SelectItem key={bl.code} value={bl.code}>{bl.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* Per diem */}
                <td className="px-2 py-1.5">
                  {timesheet.per_diem_enabled ? (
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
                  ) : (
                    <span className="text-muted-foreground px-1">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
