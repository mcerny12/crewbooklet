// TV FFS pay calculation engine — pure functions, no UI dependencies.
//
// TV FFS (ver.di) Gagentarifvertrag 2024–2026, October 2024.
//
// Algorithm overview:
//
// For each day:
//   1. rawWorkMinutes  = workEnd - workStart - breakMinutes  (0 if not worked)
//   2. travelMinutes   = (travelToMinutes + travelBackMinutes) if travelQualifies, else 0
//   3. totalWorkMinutes = rawWorkMinutes + travelMinutes
//   4. billedMinutes   = max(totalWorkMinutes, dailyOtStartH×60) if dailyMinimum8h, else totalWorkMinutes
//      A "called day" is billed at a minimum of dailyOtStartH hours (TV FFS default: 10h —
//      a film day is contractually 10h; this is distinct from the general ArbZG/§5.2.4
//      8h floor, which this app does not separately model).
//   5. surchargeEligibleMinutes = billedMinutes - travelMinutes.
//      § 12.4 TV FFS: qualifying travel is paid like working time (counts toward
//      billedMinutes, the daily minimum, and base pay) but "ohne jegliche Zuschläge" —
//      it must never itself receive, or count toward crossing the threshold for,
//      any surcharge (daily/weekly OT, night, Sat/Sun/holiday).
//   6. nightMinutes    = overlap of work window with 22:00–06:00 (travel excluded by construction)
//   7. dailyOtBand1/2  = minutes of surchargeEligibleMinutes beyond dailyOtStartH (Mon–Fri only)
//   8. perDiemCents    = resolved from perDiemType.
//      § 12.2 TV FFS: auto → partial when totalWorkMinutes ≥ 480 (actual hours, not billing floor).
//      Per diems are suppressed when placeOfWork matches homeBase (local booking); an unset
//      placeOfWork defaults to homeBase, not "away" — it must never earn a per diem by omission.
//
// Weekly OT:
//   weeklyCountMinutes (built from each day's surchargeEligibleMinutes, i.e. travel excluded):
//     - Sat/Sun/Holiday: contribute all of it to the weekly counter
//     - Mon–Fri: contribute min(it, dailyOtStartH×60) to weekly counter
//       (hours beyond dailyOtStartH are already covered by daily OT, not weekly)
//   weeklyOtMinutes = max(0, weeklyCountMinutes - weeklyOtThresholdH×60)
//   Split into band1 (up to weeklyOtBand1EndH×60) and band2 (above).
//
// Rest-period violations (ArbZG § 5 / TV FFS § 5.8):
//   Minimum 11h rest between consecutive worked calendar days. Since qualifying
//   travel counts as Arbeitszeit (§ 5.2.2 / § 12.4), a day's travel-back extends
//   its effective end and the next day's travel-to pulls its effective start
//   forward — travel can turn an apparently-compliant gap into a violation.
//   Violation compensation = shortfall minutes × hourlyCents / 60.
//
// Surcharges:
//   All surcharges are ADDITIVE on top of the base hourly rate (C1 answer),
//   and computed on surchargeEligibleMinutes, never on travel minutes.
//   formula per component: Math.round((minutes/60) × hourlyRateCents × pct/100)
//
// dayTotalCents (per-day display):
//   For each worked day: billedMinutes × hourlyCents + day-level surcharges + perDiemCents.
//   This shows the full per-day contribution including the OT hour's base + surcharge.
//   Σ dayTotalCents + weeklyOtBand1Cents + weeklyOtBand2Cents + restViolationCents always
//   equals totalGrossCents — weekly-OT premiums and rest-violation pay are week-level
//   components, not attributed to any single day. totalGrossCents remains the one
//   authoritative total — UI must read it directly rather than re-deriving its own.

import type { DayInput, Ruleset, DayResult, WeekResult } from './types';
import { hourlyRateCents } from './ruleset';

const MINUTES_PER_HOUR = 60;
const MIN_REST_MINUTES = 11 * 60; // ArbZG § 5 / TV FFS § 5.8

/** Parse 'HH:MM' → total minutes since 00:00. Returns null if null input. */
function parseTime(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * MINUTES_PER_HOUR + m;
}

/** Day of week: 0 = Monday … 6 = Sunday */
function dayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return (d.getDay() + 6) % 7; // shift JS Sunday(0) → 6
}

/** Minutes in the [22:00, 06:00+24h) night window that overlap with [start, end). */
function nightMinutes(startMin: number, endMin: number): number {
  // Night window spans two calendar segments: [0, 360) and [1320, 1440).
  // We normalise by allowing end > 1440 for overnight work.
  let night = 0;

  const segments: [number, number][] = [
    [0, 6 * MINUTES_PER_HOUR],       // 00:00–06:00
    [22 * MINUTES_PER_HOUR, endMin > 24 * MINUTES_PER_HOUR
      ? 24 * MINUTES_PER_HOUR + 6 * MINUTES_PER_HOUR  // allow past midnight
      : 24 * MINUTES_PER_HOUR],      // 22:00–24:00 (or beyond if overnight)
  ];

  for (const [lo, hi] of segments) {
    const overlap = Math.max(0, Math.min(endMin, hi) - Math.max(startMin, lo));
    night += overlap;
  }

  // Recalculate cleanly for overnight work (end > 1440) to avoid double-counting
  // the extended segment[1] range above.
  if (endMin > 24 * MINUTES_PER_HOUR) {
    night = 0;
    const window1Lo = 0;
    const window1Hi = 6 * MINUTES_PER_HOUR;
    const window2Lo = 22 * MINUTES_PER_HOUR;
    const window2Hi = 24 * MINUTES_PER_HOUR + 6 * MINUTES_PER_HOUR; // 1800 min

    night += Math.max(0, Math.min(endMin, window1Hi) - Math.max(startMin, window1Lo));
    night += Math.max(0, Math.min(endMin, window2Hi) - Math.max(startMin, window2Lo));
  }

  return night;
}

/** Surcharge amount in cents: Math.round((minutes/60) * hourlyCents * pct/100). */
function surchargeCents(minutes: number, hourlyCents: number, pct: number): number {
  if (minutes <= 0 || pct <= 0) return 0;
  return Math.round((minutes / MINUTES_PER_HOUR) * hourlyCents * pct / 100);
}

/**
 * Resolve per diem type for a day.
 * § 12.2 TV FFS: the trigger is based on actual working time (Abwesenheitszeit),
 * NOT the minimum-billing floor. The 8h threshold applies to totalWorkMinutes.
 * 'auto' → 'partial' if totalWorkMinutes ≥ 480 (actual hours), else 'none'.
 */
function resolvePerDiem(type: string, totalWorkMinutes: number): 'partial' | 'full' | 'none' {
  if (type === 'full') return 'full';
  if (type === 'partial') return 'partial';
  if (type === 'none') return 'none';
  // 'auto': partial per diem for ≥8h actual work; 'none' below threshold
  return totalWorkMinutes >= 8 * MINUTES_PER_HOUR ? 'partial' : 'none';
}

/**
 * Calculate a single day.
 *
 * `hourlyCents` is optional; when provided it is used to compute `dayTotalCents`.
 * When omitted it is derived from the ruleset (same value, but pre-computing in
 * calculateWeek avoids the redundant division for every day in the week).
 */
export function calculateDay(
  day: DayInput,
  ruleset: Ruleset,
  hourlyCents: number = hourlyRateCents(ruleset.weeklyRateCents, ruleset.rateType),
): DayResult {
  const dow = dayOfWeek(day.date);
  const isSaturday = dow === 5;
  const isSunday = dow === 6;
  const isHoliday = ruleset.publicHolidays.has(day.date);
  const isWeekend = isSaturday || isSunday;

  const startMin = parseTime(day.workStart);
  const endMin = parseTime(day.workEnd);
  const isWorked = startMin !== null && endMin !== null;

  // Raw and travel minutes
  let rawWorkMinutes = 0;
  let travelMinutes = 0;

  if (isWorked && endMin !== null && startMin !== null) {
    // Handle overnight: if end < start, add 24h
    const adjustedEnd = endMin < startMin ? endMin + 24 * MINUTES_PER_HOUR : endMin;
    rawWorkMinutes = Math.max(0, adjustedEnd - startMin - day.breakMinutes);

    if (day.travelQualifies) {
      travelMinutes = day.travelToMinutes + day.travelBackMinutes;
    }
  }

  const totalWorkMinutes = rawWorkMinutes + travelMinutes;

  // Daily minimum = dailyOtStartH (TV FFS default: 10h — a film day is contractually
  // 10h) when the flag is on. Each called day is billed for at least that many hours
  // regardless of actual time worked. A day's own dailyMinimumOverride (if set) takes
  // precedence over the timesheet-level ruleset.dailyMinimum8h default.
  const useDailyMinimum = day.dailyMinimumOverride ?? ruleset.dailyMinimum8h;
  const dailyMinimumMinutes = ruleset.dailyOtStartH * MINUTES_PER_HOUR;
  const billedMinutes = isWorked
    ? (useDailyMinimum ? Math.max(totalWorkMinutes, dailyMinimumMinutes) : totalWorkMinutes)
    : 0;

  // § 12.4 TV FFS: qualifying travel is paid like working time ("wie Arbeitszeit")
  // but "ohne jegliche Zuschläge" — without any surcharges whatsoever. So travel
  // minutes count toward billedMinutes (base pay, daily minimum) but must be
  // excluded from every surcharge-rate and threshold calculation below.
  const surchargeEligibleMinutes = billedMinutes - travelMinutes;

  // Night minutes (22:00–06:00) — only from the raw work window, not travel
  let nightMins = 0;
  if (isWorked && startMin !== null && endMin !== null) {
    const adjustedEnd = endMin < startMin ? endMin + 24 * MINUTES_PER_HOUR : endMin;
    nightMins = nightMinutes(startMin, adjustedEnd);
    // Cap at billedMinutes (minimum-8h can't create night time)
    nightMins = Math.min(nightMins, billedMinutes);
  }

  // Daily OT — only on weekdays (§ 5.4.3.2), Mon–Fri
  // Weekend / holidays: their billedMinutes go entirely into the weekly counter
  const dailyOtThresholdMin = ruleset.dailyOtStartH * MINUTES_PER_HOUR;
  const dailyOtBand1DurationMin = MINUTES_PER_HOUR; // exactly 1 hour (hour 11)
  let dailyOtBand1Minutes = 0;
  let dailyOtBand2Minutes = 0;

  if (isWorked && !isWeekend && !isHoliday) {
    if (surchargeEligibleMinutes > dailyOtThresholdMin) {
      const overDailyOt = surchargeEligibleMinutes - dailyOtThresholdMin;
      dailyOtBand1Minutes = Math.min(overDailyOt, dailyOtBand1DurationMin);
      dailyOtBand2Minutes = Math.max(0, overDailyOt - dailyOtBand1DurationMin);
    }
  }

  // Per diem (§ 12.2 TV FFS):
  // - Suppressed when the place of work matches the home base (local booking, Bug #2).
  // - An unset place of work defaults to the home base rather than "away" —
  //   otherwise every day with placeOfWork left blank silently earned a per
  //   diem it shouldn't have (Bug #7).
  // - Auto threshold uses totalWorkMinutes (actual hours), NOT billedMinutes (Bug #3).
  let perDiemCents = 0;
  if (ruleset.perDiemEnabled && isWorked) {
    const effectivePlaceOfWork = day.placeOfWork?.trim() || ruleset.homeBase;
    const isLocalWork = effectivePlaceOfWork.toLowerCase() === ruleset.homeBase.trim().toLowerCase();
    if (!isLocalWork) {
      const resolved = resolvePerDiem(day.perDiemType, totalWorkMinutes);
      if (resolved === 'full') perDiemCents = ruleset.perDiemFullDayCents;
      else if (resolved === 'partial') perDiemCents = ruleset.perDiemPartialDayCents;
    }
  }

  // Per-day total (Bug #5 / #6): billed hours × hourly rate + all day-level surcharges + per diem.
  // This shows the full value of each OT hour (base + surcharge) so callers don't need to
  // separately add the base component of OT hours.
  // restViolation fields are always 0 here — calculateWeek fills them in for the violating day.
  let dayTotalCents = 0;
  if (isWorked) {
    const dayBase = Math.round((billedMinutes / MINUTES_PER_HOUR) * hourlyCents);
    const dayOtSurcharge =
      surchargeCents(dailyOtBand1Minutes, hourlyCents, ruleset.dailyOtBand1Pct) +
      surchargeCents(dailyOtBand2Minutes, hourlyCents, ruleset.dailyOtBand2Pct);
    const dayNight = ruleset.nightEnabled
      ? surchargeCents(nightMins, hourlyCents, ruleset.nightPct)
      : 0;
    const daySat = isSaturday && ruleset.saturdayEnabled
      ? surchargeCents(surchargeEligibleMinutes, hourlyCents, ruleset.saturdayPct)
      : 0;
    const daySun = isSunday && ruleset.sundayEnabled
      ? surchargeCents(surchargeEligibleMinutes, hourlyCents, ruleset.sundayPct)
      : 0;
    const dayHol = isHoliday && ruleset.holidayEnabled
      ? surchargeCents(surchargeEligibleMinutes, hourlyCents, ruleset.holidayPct)
      : 0;
    dayTotalCents = dayBase + dayOtSurcharge + dayNight + daySat + daySun + dayHol + perDiemCents;
  }

  return {
    date: day.date,
    isWorked,
    isSaturday,
    isSunday,
    isHoliday,
    travelMinutes,
    rawWorkMinutes,
    totalWorkMinutes,
    billedMinutes,
    nightMinutes: nightMins,
    dailyOtBand1Minutes,
    dailyOtBand2Minutes,
    perDiemCents,
    dayTotalCents,
    restViolationMinutes: 0,
    restViolationCents: 0,
  };
}

/** Calculate an entire week from its day inputs and ruleset. */
export function calculateWeek(days: DayInput[], ruleset: Ruleset): WeekResult {
  const hourlyCents = hourlyRateCents(ruleset.weeklyRateCents, ruleset.rateType);
  const dayResults = days.map((d) => calculateDay(d, ruleset, hourlyCents));

  // Weekly OT counting:
  //   - Weekdays: only the hours up to dailyOtStartH count toward the weekly threshold.
  //     Daily OT hours (beyond dailyOtStartH) are already accounted for by daily OT surcharge
  //     and are excluded from the weekly accumulator.
  //   - Sat/Sun/Holiday: ALL billedMinutes count toward weekly threshold (§ 5.4.3.4).
  const dailyOtThresholdMin = ruleset.dailyOtStartH * MINUTES_PER_HOUR;
  let weeklyCountMinutes = 0;

  for (const dr of dayResults) {
    if (!dr.isWorked) continue;
    // § 12.4 TV FFS: qualifying travel is excluded from every surcharge/threshold
    // calculation, including whether a week crosses into weekly OT territory.
    const surchargeEligible = dr.billedMinutes - dr.travelMinutes;
    const isWeekend = dr.isSaturday || dr.isSunday;
    const isHoliday = dr.isHoliday;
    if (isWeekend || isHoliday) {
      weeklyCountMinutes += surchargeEligible;
    } else {
      weeklyCountMinutes += Math.min(surchargeEligible, dailyOtThresholdMin);
    }
  }

  const weeklyOtThresholdMin = ruleset.weeklyOtThresholdH * MINUTES_PER_HOUR;
  const weeklyOtBand1EndMin = ruleset.weeklyOtBand1EndH * MINUTES_PER_HOUR;
  const weeklyOtTotal = Math.max(0, weeklyCountMinutes - weeklyOtThresholdMin);
  const weeklyOtBand1Minutes = Math.min(weeklyOtTotal, weeklyOtBand1EndMin - weeklyOtThresholdMin);
  const weeklyOtBand2Minutes = Math.max(0, weeklyOtTotal - weeklyOtBand1Minutes);

  // Aggregate day-level components
  const totalBilledMinutes = dayResults.reduce((s, d) => s + d.billedMinutes, 0);
  const totalNightMinutes = dayResults.reduce((s, d) => s + d.nightMinutes, 0);
  const totalDailyOtBand1 = dayResults.reduce((s, d) => s + d.dailyOtBand1Minutes, 0);
  const totalDailyOtBand2 = dayResults.reduce((s, d) => s + d.dailyOtBand2Minutes, 0);
  const totalPerDiem = dayResults.reduce((s, d) => s + d.perDiemCents, 0);

  // Day-type surcharge totals (billedMinutes minus travel — § 12.4 excludes
  // qualifying travel from every surcharge, including Sat/Sun/holiday rates)
  const satMinutes = dayResults.filter((d) => d.isSaturday && d.isWorked).reduce((s, d) => s + (d.billedMinutes - d.travelMinutes), 0);
  const sunMinutes = dayResults.filter((d) => d.isSunday && d.isWorked).reduce((s, d) => s + (d.billedMinutes - d.travelMinutes), 0);
  const holMinutes = dayResults.filter((d) => d.isHoliday && d.isWorked).reduce((s, d) => s + (d.billedMinutes - d.travelMinutes), 0);

  // Base pay is always proportional to actual billed hours — weeklyRateCents is not
  // a floor or a cap, it only defines the hourly rate (weeklyRateCents / 50 or / 40).
  // § 5.7.2 TV FFS: a Wochengage is converted per the number of days actually worked/
  // contracted, not paid in full regardless of days worked. A full 5 × dailyOtStartH
  // (50h) week naturally comes out to exactly weeklyRateCents; fewer days pay
  // proportionally less (only the "daily wage" for days actually worked), and a
  // 6th/7th day or daily-OT hours naturally pay proportionally more, on top of
  // whatever dailyOt*/weeklyOt* Zuschlag premiums apply (those are separate,
  // additive surcharges — see below).
  const basePayCents = Math.round((totalBilledMinutes / MINUTES_PER_HOUR) * hourlyCents);

  const dailyOtBand1Cents = surchargeCents(totalDailyOtBand1, hourlyCents, ruleset.dailyOtBand1Pct);
  const dailyOtBand2Cents = surchargeCents(totalDailyOtBand2, hourlyCents, ruleset.dailyOtBand2Pct);
  const weeklyOtBand1Cents = ruleset.weeklyOtEnabled
    ? surchargeCents(weeklyOtBand1Minutes, hourlyCents, ruleset.weeklyOtBand1Pct)
    : 0;
  const weeklyOtBand2Cents = ruleset.weeklyOtEnabled
    ? surchargeCents(weeklyOtBand2Minutes, hourlyCents, ruleset.weeklyOtBand2Pct)
    : 0;

  const nightSurchargeCents = ruleset.nightEnabled
    ? surchargeCents(totalNightMinutes, hourlyCents, ruleset.nightPct)
    : 0;

  const saturdaySurchargeCents = ruleset.saturdayEnabled
    ? surchargeCents(satMinutes, hourlyCents, ruleset.saturdayPct)
    : 0;
  const sundaySurchargeCents = ruleset.sundayEnabled
    ? surchargeCents(sunMinutes, hourlyCents, ruleset.sundayPct)
    : 0;
  const holidaySurchargeCents = ruleset.holidayEnabled
    ? surchargeCents(holMinutes, hourlyCents, ruleset.holidayPct)
    : 0;

  // Rest-period violation detection (ArbZG § 5 / TV FFS § 5.8).
  // Check each consecutive pair of worked calendar days: minimum 11h rest between shifts.
  // Compensation = shortfall hours × hourlyRateCents (at base rate, not surcharge).
  let restViolationCents = 0;
  const mutableResults = [...dayResults];

  for (let i = 0; i < days.length - 1; i++) {
    const dayA = days[i];
    const dayB = days[i + 1];
    const drA = mutableResults[i];
    const drB = mutableResults[i + 1];

    if (!drA.isWorked || !drB.isWorked) continue;

    // Only check pairs that are consecutive calendar days
    const dateA = new Date(dayA.date + 'T00:00:00');
    const dateB = new Date(dayB.date + 'T00:00:00');
    const calendarDaysDiff = Math.round(
      (dateB.getTime() - dateA.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (calendarDaysDiff !== 1) continue;

    const startAMin = parseTime(dayA.workStart);
    const endAMin = parseTime(dayA.workEnd);
    const startBMin = parseTime(dayB.workStart);
    if (startAMin === null || endAMin === null || startBMin === null) continue;

    // Adjust end for overnight work (work_end < work_start means past midnight)
    const rawEndAMin = endAMin < startAMin ? endAMin + 24 * MINUTES_PER_HOUR : endAMin;

    // § 5.2.2 / § 12.4 TV FFS: qualifying travel counts as Arbeitszeit, so it
    // extends the end of day A's working time (travel back) and pulls forward
    // the start of day B's working time (travel to) for rest-period purposes —
    // travel eating into the rest window can turn an apparently-compliant gap
    // into a real violation.
    const travelBackA = dayA.travelQualifies ? dayA.travelBackMinutes : 0;
    const travelToB = dayB.travelQualifies ? dayB.travelToMinutes : 0;
    const actualEndAMin = rawEndAMin + travelBackA;
    const effectiveStartBMin = startBMin - travelToB;

    // Gap from end of day A to start of day B (next calendar day)
    const gapMinutes = 24 * MINUTES_PER_HOUR - actualEndAMin + effectiveStartBMin;

    if (gapMinutes < MIN_REST_MINUTES) {
      const shortfall = MIN_REST_MINUTES - gapMinutes;
      const violationCents = Math.round((shortfall / MINUTES_PER_HOUR) * hourlyCents);
      restViolationCents += violationCents;
      // Attribute to the earlier day (the shift that ended too late)
      mutableResults[i] = {
        ...mutableResults[i],
        restViolationMinutes: shortfall,
        restViolationCents: violationCents,
      };
    }
  }

  const totalGrossCents =
    basePayCents +
    dailyOtBand1Cents +
    dailyOtBand2Cents +
    weeklyOtBand1Cents +
    weeklyOtBand2Cents +
    nightSurchargeCents +
    saturdaySurchargeCents +
    sundaySurchargeCents +
    holidaySurchargeCents +
    totalPerDiem +
    restViolationCents;

  return {
    days: mutableResults,
    totalBilledMinutes,
    weeklyCountMinutes,
    weeklyOtBand1Minutes,
    weeklyOtBand2Minutes,
    basePayCents,
    dailyOtBand1Cents,
    dailyOtBand2Cents,
    weeklyOtBand1Cents,
    weeklyOtBand2Cents,
    nightSurchargeCents,
    saturdaySurchargeCents,
    sundaySurchargeCents,
    holidaySurchargeCents,
    perDiemCents: totalPerDiem,
    restViolationCents,
    totalGrossCents,
    hourlyRateCents: hourlyCents,
  };
}
