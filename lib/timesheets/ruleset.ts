// Ruleset builder: turns a Timesheet DB row into the Ruleset shape consumed by the engine.
//
// TV FFS (ver.di) Gagentarifvertrag 2024–2026, effective October 2024.
// "full_tarif" mode hard-codes all parameters from the contract.
// "custom_tarif" mode starts from the same defaults but applies the
// overrides stored in timesheets.custom_rules (CustomRulesOverride).

import type { Timesheet, Ruleset, CustomRulesOverride } from './types';

const TV_FFS_DEFAULTS = {
  // § 5.4.3.2: daily OT
  dailyOtStartH: 10,      // OT starts after the 10th hour
  dailyOtBand1Pct: 25,    // hours 11 (one band, 60 min)
  dailyOtBand2Pct: 50,    // hours 12+

  // § 5.4.3.3–3.4: weekly OT (Sat/Sun hours count toward this)
  weeklyOtThresholdH: 50,
  weeklyOtBand1EndH: 55,
  weeklyOtBand1Pct: 25,
  weeklyOtBand2Pct: 50,

  // § 5.5: night surcharge (22:00–06:00)
  nightPct: 25,

  // § 5.6.3–5.6.4: day-type surcharges (stack with OT surcharges)
  saturdayPct: 25,
  sundayPct: 75,
  holidayPct: 100,
} as const;

/** Hourly rate as an integer number of cents. */
export function hourlyRateCents(weeklyRateCents: number, rateType: 'standard' | 'reduced'): number {
  // § 5.7.1: standard = weeklyRate / 50; reduced = weeklyRate / 40
  // Integer division with rounding to nearest cent.
  const divisor = rateType === 'reduced' ? 40 : 50;
  return Math.round(weeklyRateCents / divisor);
}

/** Build the fully resolved Ruleset from a Timesheet row and a pre-computed holiday set. */
export function buildRuleset(sheet: Timesheet, publicHolidays: Set<string>): Ruleset {
  const overrides: CustomRulesOverride = sheet.calc_mode === 'custom_tarif' && sheet.custom_rules
    ? sheet.custom_rules
    : {};

  const r = TV_FFS_DEFAULTS;

  return {
    weeklyRateCents: sheet.weekly_rate_cents,
    rateType: sheet.rate_type,
    dailyMinimum8h: sheet.daily_minimum_8h,

    dailyOtStartH: overrides.dailyOtStartH ?? r.dailyOtStartH,
    dailyOtBand1Pct: overrides.dailyOtBand1Pct ?? r.dailyOtBand1Pct,
    dailyOtBand2Pct: overrides.dailyOtBand2Pct ?? r.dailyOtBand2Pct,

    weeklyOtThresholdH: overrides.weeklyOtThresholdH ?? r.weeklyOtThresholdH,
    weeklyOtBand1EndH: overrides.weeklyOtBand1EndH ?? r.weeklyOtBand1EndH,
    weeklyOtBand1Pct: overrides.weeklyOtBand1Pct ?? r.weeklyOtBand1Pct,
    weeklyOtBand2Pct: overrides.weeklyOtBand2Pct ?? r.weeklyOtBand2Pct,

    nightEnabled: true,
    nightPct: overrides.nightPct ?? r.nightPct,

    saturdayEnabled: true,
    saturdayPct: overrides.saturdayPct ?? r.saturdayPct,
    sundayEnabled: true,
    sundayPct: overrides.sundayPct ?? r.sundayPct,
    holidayEnabled: true,
    holidayPct: overrides.holidayPct ?? r.holidayPct,

    perDiemEnabled: sheet.per_diem_enabled,
    perDiemFullDayCents: sheet.per_diem_full_day_cents,
    perDiemPartialDayCents: sheet.per_diem_partial_day_cents,

    publicHolidays,
  };
}
