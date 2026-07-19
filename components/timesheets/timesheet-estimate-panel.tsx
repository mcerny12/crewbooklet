'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { parseISO, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeTimesheetWeekResult, formatEuroCents as centsToEuro } from '@/lib/timesheets/week-result';
import type { Timesheet, TimesheetEntry } from '@/lib/timesheets/types';

function minutesToHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Re-compute a surcharge component using the same formula as calculateDay. */
function surcharge(minutes: number, hourlyCents: number, pct: number): number {
  if (minutes <= 0 || pct <= 0) return 0;
  return Math.round((minutes / 60) * hourlyCents * pct / 100);
}

interface Props {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
}

export function TimesheetEstimatePanel({ timesheet, entries }: Props) {
  const t = useTranslations('timesheets');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const computed = useMemo(
    () => computeTimesheetWeekResult(timesheet, entries),
    [timesheet, entries]
  );

  if (!computed) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        {t('estimate.noRate')}
      </div>
    );
  }

  const { result, ruleset } = computed;
  const hc = result.hourlyRateCents;

  const workedDays = result.days.filter(d => d.isWorked);
  const perDaySum = workedDays.reduce((s, d) => s + d.dayTotalCents, 0);
  const weeklyOtCents = result.weeklyOtBand1Cents + result.weeklyOtBand2Cents;
  const weeklyOtMinutes = result.weeklyOtBand1Minutes + result.weeklyOtBand2Minutes;
  const runningTotal = perDaySum + weeklyOtCents + result.restViolationCents;

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
          {t('estimate.title')}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground italic">
          {t('estimate.adminOnly')}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-3 text-xs">
        <div>
          <div className="text-muted-foreground">{t('estimate.totalHoursLabel')}</div>
          <div className="font-semibold">{minutesToHours(result.totalBilledMinutes)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">{t('estimate.hourlyRateLabel')}</div>
          <div className="font-semibold">{centsToEuro(hc)}/h</div>
        </div>
        {weeklyOtMinutes > 0 && (
          <div>
            <div className="text-muted-foreground">{t('estimate.weeklyOtShort')}</div>
            <div className="font-semibold text-amber-600">{minutesToHours(weeklyOtMinutes)}</div>
          </div>
        )}
      </div>

      {/* Per-day breakdown with component detail */}
      {workedDays.length > 0 && (
        <div className="divide-y divide-border/40 mb-3">
          {workedDays.map(d => {
            const dayLabel = format(parseISO(d.date), 'EEE d. MMM', { locale: dateLocale });

            // Compute each pay component (mirrors calculateDay logic exactly).
            // § 12.4 TV FFS: qualifying travel is billed but never surcharged, so
            // Sat/Sun/holiday rates apply to (billedMinutes - travelMinutes), same
            // as calculateDay's surchargeEligibleMinutes — dailyOtBand1/2Minutes
            // are already travel-excluded at the source, no adjustment needed here.
            const surchargeEligibleMinutes = d.billedMinutes - d.travelMinutes;
            const dayBase = Math.round((d.billedMinutes / 60) * hc);
            const band1S = surcharge(d.dailyOtBand1Minutes, hc, ruleset.dailyOtBand1Pct);
            const band2S = surcharge(d.dailyOtBand2Minutes, hc, ruleset.dailyOtBand2Pct);
            const nightS = ruleset.nightEnabled ? surcharge(d.nightMinutes, hc, ruleset.nightPct) : 0;
            const satS   = d.isSaturday && ruleset.saturdayEnabled ? surcharge(surchargeEligibleMinutes, hc, ruleset.saturdayPct) : 0;
            const sunS   = d.isSunday  && ruleset.sundayEnabled   ? surcharge(surchargeEligibleMinutes, hc, ruleset.sundayPct)   : 0;
            const holS   = d.isHoliday && ruleset.holidayEnabled  ? surcharge(surchargeEligibleMinutes, hc, ruleset.holidayPct)  : 0;

            type Line = { label: string; cents: number; amber?: boolean };
            const lines: Line[] = [
              { label: t('estimate.baseHoursLine', { hours: minutesToHours(d.billedMinutes), rate: centsToEuro(hc) }), cents: dayBase },
            ];
            if (band1S > 0) lines.push({ label: t('estimate.dailyOtLine', { hours: minutesToHours(d.dailyOtBand1Minutes), pct: ruleset.dailyOtBand1Pct }), cents: band1S });
            if (band2S > 0) lines.push({ label: t('estimate.dailyOtLine', { hours: minutesToHours(d.dailyOtBand2Minutes), pct: ruleset.dailyOtBand2Pct }), cents: band2S });
            if (nightS > 0) lines.push({ label: t('estimate.nightLine', { hours: minutesToHours(d.nightMinutes), pct: ruleset.nightPct }), cents: nightS });
            if (satS   > 0) lines.push({ label: t('estimate.saturdayLine', { pct: ruleset.saturdayPct }), cents: satS });
            if (sunS   > 0) lines.push({ label: t('estimate.sundayLine', { pct: ruleset.sundayPct }), cents: sunS });
            if (holS   > 0) lines.push({ label: t('estimate.holidayLine', { pct: ruleset.holidayPct }), cents: holS });
            if (d.perDiemCents > 0) lines.push({ label: t('estimate.perDiemLine'), cents: d.perDiemCents });
            if (d.restViolationMinutes > 0) lines.push({
              label: t('estimate.restViolationLine', { hours: minutesToHours(d.restViolationMinutes) }),
              cents: d.restViolationCents,
              amber: true,
            });

            return (
              <div key={d.date} className="py-1.5">
                {/* Day header row */}
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(
                    'font-medium w-28',
                    d.restViolationMinutes > 0 && 'text-amber-600',
                  )}>
                    {dayLabel}
                    {d.isSaturday && <span className="ml-1 text-[10px] text-muted-foreground font-normal">{t('day.satShort')}</span>}
                    {d.isSunday   && <span className="ml-1 text-[10px] text-muted-foreground font-normal">{t('day.sunShort')}</span>}
                    {d.isHoliday  && <span className="ml-1 text-[10px] text-amber-400 font-normal">{t('day.holidayShort')}</span>}
                  </span>
                  <span className="font-semibold tabular-nums">{centsToEuro(d.dayTotalCents)}</span>
                </div>
                {/* Component sub-rows */}
                {lines.map((line, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between text-[10px] mt-0.5 pl-3',
                    line.amber ? 'text-amber-600' : 'text-muted-foreground',
                  )}>
                    <span>{line.label}</span>
                    <span className="tabular-nums">{centsToEuro(line.cents)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly OT aggregate */}
      {weeklyOtCents > 0 && (
        <div className="mb-3 text-xs">
          <div className="flex items-center justify-between py-0.5">
            <span className="text-muted-foreground">
              {t('estimate.weeklyOtLabel')}
              <span className="ml-1 text-[10px] opacity-60">({minutesToHours(weeklyOtMinutes)})</span>
            </span>
            <span className="font-medium tabular-nums">{centsToEuro(weeklyOtCents)}</span>
          </div>
          {result.weeklyOtBand1Minutes > 0 && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-3 mt-0.5">
              <span>{t('estimate.weeklyOtLine', { hours: minutesToHours(result.weeklyOtBand1Minutes), pct: ruleset.weeklyOtBand1Pct })}</span>
              <span className="tabular-nums">{centsToEuro(result.weeklyOtBand1Cents)}</span>
            </div>
          )}
          {result.weeklyOtBand2Minutes > 0 && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-3 mt-0.5">
              <span>{t('estimate.weeklyOtLine', { hours: minutesToHours(result.weeklyOtBand2Minutes), pct: ruleset.weeklyOtBand2Pct })}</span>
              <span className="tabular-nums">{centsToEuro(result.weeklyOtBand2Cents)}</span>
            </div>
          )}
        </div>
      )}

      {/* Rest violation aggregate */}
      {result.restViolationCents > 0 && (
        <div className="mb-3 flex items-center justify-between text-xs text-amber-600">
          <span>{t('estimate.restViolationTotal')}</span>
          <span className="font-medium tabular-nums">{centsToEuro(result.restViolationCents)}</span>
        </div>
      )}

      {/* Running total */}
      <div className="pt-2 border-t border-border flex items-center justify-between">
        <span className="text-sm font-semibold">{t('estimate.subtotal')}</span>
        <span className="text-sm font-bold tabular-nums text-primary">{centsToEuro(runningTotal)}</span>
      </div>

      {guaranteeApplies && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {t('estimate.guarantee', { amount: centsToEuro(timesheet.weekly_rate_cents) })}
        </div>
      )}
    </div>
  );
}
