// Sanity tests for the computeTimesheetWeekResult wrapper — the underlying
// calculation logic itself is covered exhaustively in calculation.test.ts;
// these just confirm the Timesheet/TimesheetEntry → DayInput[] wiring is
// correct (field mapping, week_start → 7 days, holiday/bundesland lookup).

import { describe, it, expect } from 'vitest';
import { computeTimesheetWeekResult, formatEuroCents } from './week-result';
import type { Timesheet, TimesheetEntry } from './types';

const BASE_TIMESHEET: Timesheet = {
  id: 't1',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  user_id: 'u1',
  project_id: null,
  week_start: '2026-07-13', // Monday
  status: 'draft',
  person_name: 'Test Person',
  position_title: 'Gaffer',
  department: 'Lighting',
  calc_mode: 'full_tarif',
  rate_type: 'standard',
  weekly_rate_cents: 200000, // €2000
  daily_minimum_8h: true,
  per_diem_enabled: true,
  per_diem_full_day_cents: 2800,
  per_diem_partial_day_cents: 1400,
  custom_rules: null,
};

function entry(overrides: Partial<TimesheetEntry> & { entry_date: string }): TimesheetEntry {
  return {
    id: 'e-' + overrides.entry_date,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    timesheet_id: 't1',
    work_start: null,
    work_end: null,
    break_minutes: 0,
    travel_to_minutes: 0,
    travel_back_minutes: 0,
    travel_qualifies: false,
    place_of_work: null,
    bundesland: null,
    per_diem_type: 'auto',
    notes: null,
    daily_minimum_override: null,
    ...overrides,
  };
}

describe('computeTimesheetWeekResult', () => {
  it('returns null when weekly_rate_cents is 0', () => {
    const r = computeTimesheetWeekResult({ ...BASE_TIMESHEET, weekly_rate_cents: 0 }, []);
    expect(r).toBeNull();
  });

  it('maps entries to the correct 7 days of the week and computes a result', () => {
    const entries: TimesheetEntry[] = [
      entry({ entry_date: '2026-07-13', work_start: '08:00', work_end: '18:00' }), // Mon 10h
      entry({ entry_date: '2026-07-16', work_start: '08:00', work_end: '18:00' }), // Thu 10h
    ];
    const r = computeTimesheetWeekResult(BASE_TIMESHEET, entries);
    expect(r).not.toBeNull();
    expect(r!.result.days).toHaveLength(7);
    expect(r!.result.days[0].date).toBe('2026-07-13');
    expect(r!.result.days[6].date).toBe('2026-07-19');
    expect(r!.result.days[0].isWorked).toBe(true);
    expect(r!.result.days[1].isWorked).toBe(false); // Tue, no entry
    expect(r!.result.totalGrossCents).toBeGreaterThan(0);
  });

  it('exposes the ruleset alongside the result', () => {
    const r = computeTimesheetWeekResult(BASE_TIMESHEET, []);
    expect(r!.ruleset.weeklyRateCents).toBe(200000);
    expect(r!.ruleset.dailyOtStartH).toBe(10);
  });
});

describe('formatEuroCents', () => {
  it('formats cents as German-locale EUR currency', () => {
    expect(formatEuroCents(200000)).toBe('2.000,00 €');
    expect(formatEuroCents(0)).toBe('0,00 €');
  });
});
