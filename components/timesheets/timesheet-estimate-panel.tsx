'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { parseISO, format, addDays } from 'date-fns';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateWeek } from '@/lib/timesheets/calculation';
import { buildRuleset } from '@/lib/timesheets/ruleset';
import { getWeekHolidays } from '@/lib/timesheets/holidays';
import type { Timesheet, TimesheetEntry } from '@/lib/timesheets/types';
import type { WeekResult } from '@/lib/timesheets/types';

function centsToEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function minutesToHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function BreakdownRow({
  label,
  cents,
  minuteLabel,
}: {
  label: string;
  cents: number;
  minuteLabel?: string;
}) {
  if (cents === 0) return null;
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className="text-muted-foreground">
        {label}
        {minuteLabel && <span className="ml-1 text-[10px] opacity-60">({minuteLabel})</span>}
      </span>
      <span className="font-medium tabular-nums">{centsToEuro(cents)}</span>
    </div>
  );
}

interface Props {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
}

export function TimesheetEstimatePanel({ timesheet, entries }: Props) {
  const t = useTranslations('timesheets.estimate');

  const result = useMemo((): WeekResult | null => {
    if (timesheet.weekly_rate_cents === 0) return null;

    // Determine the primary bundesland from entries (most common non-null value)
    const bundeslandCounts: Record<string, number> = {};
    for (const e of entries) {
      if (e.bundesland) bundeslandCounts[e.bundesland] = (bundeslandCounts[e.bundesland] ?? 0) + 1;
    }
    const primaryBl = Object.entries(bundeslandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'DE-BY';

    const publicHolidays = getWeekHolidays(timesheet.week_start, primaryBl);
    const ruleset = buildRuleset(timesheet, publicHolidays);

    const dayInputs = entries.map(e => ({
      date: e.entry_date,
      workStart: e.work_start,
      workEnd: e.work_end,
      breakMinutes: e.break_minutes,
      travelToMinutes: e.travel_to_minutes,
      travelBackMinutes: e.travel_back_minutes,
      travelQualifies: e.travel_qualifies,
      bundesland: e.bundesland,
      perDiemType: e.per_diem_type,
    }));

    // Ensure all 7 days of the week exist (fill missing with off-days)
    const monday = parseISO(timesheet.week_start);
    const allDays = Array.from({ length: 7 }, (_, i) => {
      const date = format(addDays(monday, i), 'yyyy-MM-dd');
      return (
        dayInputs.find(d => d.date === date) ?? {
          date,
          workStart: null,
          workEnd: null,
          breakMinutes: 0,
          travelToMinutes: 0,
          travelBackMinutes: 0,
          travelQualifies: false,
          bundesland: null,
          perDiemType: 'none' as const,
        }
      );
    });

    return calculateWeek(allDays, ruleset);
  }, [timesheet, entries]);

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        {t('basePayLabel')} — Wochengage nicht hinterlegt
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('title')}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground italic">{t('adminOnly')}</span>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-3 text-xs">
        <div>
          <div className="text-muted-foreground">Stunden gesamt</div>
          <div className="font-semibold">{minutesToHours(result.totalBilledMinutes)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Stundensatz</div>
          <div className="font-semibold">{centsToEuro(result.hourlyRateCents)}/h</div>
        </div>
        {result.weeklyOtBand1Minutes + result.weeklyOtBand2Minutes > 0 && (
          <div>
            <div className="text-muted-foreground">Wochen-ÜZ</div>
            <div className="font-semibold text-amber-600">
              {minutesToHours(result.weeklyOtBand1Minutes + result.weeklyOtBand2Minutes)}
            </div>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="divide-y divide-border/50">
        <BreakdownRow label={t('basePayLabel')} cents={result.basePayCents} />
        <BreakdownRow
          label={t('dailyOtLabel')}
          cents={result.dailyOtBand1Cents + result.dailyOtBand2Cents}
          minuteLabel={minutesToHours(
            result.days.reduce((s, d) => s + d.dailyOtBand1Minutes + d.dailyOtBand2Minutes, 0)
          )}
        />
        <BreakdownRow
          label={t('weeklyOtLabel')}
          cents={result.weeklyOtBand1Cents + result.weeklyOtBand2Cents}
          minuteLabel={minutesToHours(result.weeklyOtBand1Minutes + result.weeklyOtBand2Minutes)}
        />
        <BreakdownRow
          label={t('nightLabel')}
          cents={result.nightSurchargeCents}
          minuteLabel={minutesToHours(result.days.reduce((s, d) => s + d.nightMinutes, 0))}
        />
        <BreakdownRow label={t('saturdayLabel')} cents={result.saturdaySurchargeCents} />
        <BreakdownRow label={t('sundayLabel')} cents={result.sundaySurchargeCents} />
        <BreakdownRow label={t('holidayLabel')} cents={result.holidaySurchargeCents} />
        <BreakdownRow label={t('perDiemLabel')} cents={result.perDiemCents} />
      </div>

      {/* Total */}
      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
        <span className="text-sm font-semibold">{t('totalLabel')}</span>
        <span className={cn('text-sm font-bold tabular-nums', 'text-primary')}>
          {centsToEuro(result.totalGrossCents)}
        </span>
      </div>
    </div>
  );
}
