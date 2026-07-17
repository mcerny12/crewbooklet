'use client';

import { useMemo } from 'react';
import { parseISO, format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateWeek } from '@/lib/timesheets/calculation';
import { buildRuleset } from '@/lib/timesheets/ruleset';
import { getWeekHolidays } from '@/lib/timesheets/holidays';
import type { Timesheet, TimesheetEntry, PerDiemType, WeekResult } from '@/lib/timesheets/types';

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

interface AggregateRowProps {
  label: string;
  cents: number;
  minuteLabel?: string;
  highlight?: boolean;
}

function AggregateRow({ label, cents, minuteLabel, highlight }: AggregateRowProps) {
  if (cents === 0) return null;
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className={cn('text-muted-foreground', highlight && 'text-amber-600')}>
        {label}
        {minuteLabel && <span className="ml-1 text-[10px] opacity-60">({minuteLabel})</span>}
      </span>
      <span className={cn('font-medium tabular-nums', highlight && 'text-amber-600')}>
        {centsToEuro(cents)}
      </span>
    </div>
  );
}

interface Props {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
}

export function TimesheetEstimatePanel({ timesheet, entries }: Props) {
  const result = useMemo((): WeekResult | null => {
    if (timesheet.weekly_rate_cents === 0) return null;

    // Determine the primary bundesland from entries (most common non-null value)
    const bundeslandCounts: Record<string, number> = {};
    for (const e of entries) {
      if (e.bundesland) bundeslandCounts[e.bundesland] = (bundeslandCounts[e.bundesland] ?? 0) + 1;
    }
    const primaryBl = Object.entries(bundeslandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'DE-BE';

    const publicHolidays = getWeekHolidays(timesheet.week_start, primaryBl);
    const ruleset = buildRuleset(timesheet, publicHolidays);

    const monday = parseISO(timesheet.week_start);
    const allDays = Array.from({ length: 7 }, (_, i) => {
      const date = format(addDays(monday, i), 'yyyy-MM-dd');
      const e = entries.find(en => en.entry_date === date);
      return {
        date,
        workStart: e?.work_start ?? null,
        workEnd: e?.work_end ?? null,
        breakMinutes: e?.break_minutes ?? 0,
        travelToMinutes: e?.travel_to_minutes ?? 0,
        travelBackMinutes: e?.travel_back_minutes ?? 0,
        travelQualifies: e?.travel_qualifies ?? false,
        placeOfWork: e?.place_of_work ?? null,
        bundesland: e?.bundesland ?? null,
        perDiemType: (e?.per_diem_type ?? 'auto') as PerDiemType,
      };
    });

    return calculateWeek(allDays, ruleset);
  }, [timesheet, entries]);

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Wochengage nicht hinterlegt — Hochrechnung nicht verfügbar
      </div>
    );
  }

  const workedDays = result.days.filter(d => d.isWorked);

  // Running total: sum of per-day pays + weekly OT + rest violations.
  // Each day's dayTotalCents already includes base (hourly × billed hours) + all
  // day-level surcharges (daily OT, night, sat/sun/hol) + per diem — so OT hours
  // appear at their full value (base + surcharge), not just the surcharge delta.
  // (Fixes Bug #5: no more surcharge-only display for OT hours.)
  const perDaySum = workedDays.reduce((s, d) => s + d.dayTotalCents, 0);
  const weeklyOtCents = result.weeklyOtBand1Cents + result.weeklyOtBand2Cents;
  const weeklyOtMinutes = result.weeklyOtBand1Minutes + result.weeklyOtBand2Minutes;
  const runningTotal = perDaySum + weeklyOtCents + result.restViolationCents;

  // In standard (fixed weekly rate) mode, the guarantee may exceed the running total
  // for short weeks. Note it as context.
  const guaranteeApplies =
    timesheet.daily_minimum_8h &&
    timesheet.weekly_rate_cents > 0 &&
    runningTotal < timesheet.weekly_rate_cents;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vergütungsübersicht (vertraulich)
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground italic">
          Nur für Dich und Admins sichtbar
        </span>
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
        {weeklyOtMinutes > 0 && (
          <div>
            <div className="text-muted-foreground">Wochen-ÜZ</div>
            <div className="font-semibold text-amber-600">
              {minutesToHours(weeklyOtMinutes)}
            </div>
          </div>
        )}
      </div>

      {/* Per-day breakdown (Bug #6): each worked day on its own row.
          dayTotalCents = billed hours × hourly rate + daily OT surcharge + night +
          day-type surcharge + per diem. OT hours appear at full value = base + surcharge,
          so no separate "OT surcharge only" ambiguity (Bug #5). */}
      {workedDays.length > 0 && (
        <div className="divide-y divide-border/30 mb-3">
          {workedDays.map(d => {
            const dayLabel = format(parseISO(d.date), 'EEE d. MMM', { locale: de });
            const hours = d.billedMinutes / 60;
            const hoursLabel = Number.isInteger(hours)
              ? `${hours} h`
              : `${(hours).toFixed(1).replace('.', ',')} h`;
            return (
              <div key={d.date} className="flex items-center justify-between py-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-muted-foreground w-28',
                    d.restViolationMinutes > 0 && 'text-amber-600',
                  )}>
                    {dayLabel}
                  </span>
                  <span className="text-muted-foreground/60">{hoursLabel}</span>
                  {d.isSaturday && <span className="text-[10px] text-slate-400">Sa</span>}
                  {d.isSunday && <span className="text-[10px] text-slate-400">So</span>}
                  {d.isHoliday && <span className="text-[10px] text-amber-400">Feiertag</span>}
                  {(d.dailyOtBand1Minutes + d.dailyOtBand2Minutes > 0) && (
                    <span className="text-[10px] text-primary/70">
                      +{minutesToHours(d.dailyOtBand1Minutes + d.dailyOtBand2Minutes)} ÜZ
                    </span>
                  )}
                  {d.perDiemCents > 0 && (
                    <span className="text-[10px] text-muted-foreground/60">
                      +VMA
                    </span>
                  )}
                  {d.restViolationMinutes > 0 && (
                    <span className="text-[10px] text-amber-500" title="Ruhezeit-Verstoß (ArbZG § 5)">
                      ⚠ Ruhezeit
                    </span>
                  )}
                </div>
                <span className="font-medium tabular-nums">{centsToEuro(d.dayTotalCents)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly aggregates: OT and rest violations */}
      {(weeklyOtCents > 0 || result.restViolationCents > 0) && (
        <div className="divide-y divide-border/50 mb-3">
          <AggregateRow
            label="Wochenüberstunden (+25 / +50 %)"
            cents={weeklyOtCents}
            minuteLabel={weeklyOtMinutes > 0 ? minutesToHours(weeklyOtMinutes) : undefined}
          />
          <AggregateRow
            label="Ruhezeit-Vergütung (ArbZG § 5)"
            cents={result.restViolationCents}
            highlight
          />
        </div>
      )}

      {/* Running total */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-sm font-semibold">
          Summe eingetragene Tage
        </span>
        <span className={cn('text-sm font-bold tabular-nums', 'text-primary')}>
          {centsToEuro(runningTotal)}
        </span>
      </div>

      {/* Weekly rate guarantee note — shown when actual hours sum to less than guarantee */}
      {guaranteeApplies && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          Wochengage-Garantie greift: mind. {centsToEuro(timesheet.weekly_rate_cents)}/Woche
        </div>
      )}
    </div>
  );
}
