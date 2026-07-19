// Shared helper for turning a Timesheet + its TimesheetEntry rows into a
// calculated WeekResult. Used by the week grid, the pay-estimate panel, and
// the timesheets overview (per-timesheet / per-project pay at a glance) so
// the ruleset-building and day-mapping logic lives in exactly one place.

import { parseISO, format, addDays } from 'date-fns';
import { calculateWeek } from './calculation';
import { buildRuleset } from './ruleset';
import { getWeekHolidays } from './holidays';
import type { Timesheet, TimesheetEntry, PerDiemType, Ruleset, WeekResult } from './types';

export function computeTimesheetWeekResult(
  timesheet: Timesheet,
  entries: TimesheetEntry[]
): { result: WeekResult; ruleset: Ruleset } | null {
  if (timesheet.weekly_rate_cents === 0) return null;

  const bundeslandCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.bundesland) bundeslandCounts[e.bundesland] = (bundeslandCounts[e.bundesland] ?? 0) + 1;
  }
  const primaryBl = Object.entries(bundeslandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'DE-BE';

  const publicHolidays = getWeekHolidays(timesheet.week_start, primaryBl);
  const ruleset = buildRuleset(timesheet, publicHolidays);

  const monday = parseISO(timesheet.week_start);
  const days = Array.from({ length: 7 }, (_, i) => {
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
      dailyMinimumOverride: e?.daily_minimum_override ?? null,
    };
  });

  return { result: calculateWeek(days, ruleset), ruleset };
}

export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
