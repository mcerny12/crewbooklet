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
//   4. billedMinutes   = max(totalWorkMinutes, 480) if dailyMinimum8h, else totalWorkMinutes
//   5. nightMinutes    = overlap of work window with 22:00–06:00
//   6. dailyOtBand1/2  = minutes beyond dailyOtStartH and dailyOtBand1 (Mon–Fri only)
//   7. perDiemCents    = resolved from perDiemType ('auto' → ≥480 min billed → 'partial')
//
// Weekly OT:
//   weeklyCountMinutes:
//     - Sat/Sun/Holiday: contribute all billedMinutes to the weekly counter
//     - Mon–Fri: contribute min(billedMinutes, dailyOtStartH×60) to weekly counter
//       (hours beyond dailyOtStartH are already covered by daily OT, not weekly)
//   weeklyOtMinutes = max(0, weeklyCountMinutes - weeklyOtThresholdH×60)
//   Split into band1 (up to weeklyOtBand1EndH×60) and band2 (above).
//
// Surcharges:
//   All surcharges are ADDITIVE on top of the base hourly rate (C1 answer).
//   formula per component: Math.round((minutes/60) × hourlyRateCents × pct/100)

import type { DayInput, Ruleset, DayResult, WeekResult } from './types';
import { hourlyRateCents } from './ruleset';

const MINUTES_PER_HOUR = 60;

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

/** Resolve per diem type for a day.  'auto' → 'partial' if billedMinutes ≥ 480, else 'none'. */
function resolvePerDiem(type: string, billedMinutes: number): 'partial' | 'full' | 'none' {
  if (type === 'full') return 'full';
  if (type === 'partial') return 'partial';
  if (type === 'none') return 'none';
  // 'auto': grant partial day if worked ≥ 8 hours
  return billedMinutes >= 8 * MINUTES_PER_HOUR ? 'partial' : 'none';
}

/** Calculate a single day. Returns a DayResult. */
export function calculateDay(day: DayInput, ruleset: Ruleset): DayResult {
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

  // Daily minimum 8h: only for pay calc (§ 5.2.4 TV FFS)
  const billedMinutes = isWorked
    ? (ruleset.dailyMinimum8h ? Math.max(totalWorkMinutes, 8 * MINUTES_PER_HOUR) : totalWorkMinutes)
    : 0;

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
    if (billedMinutes > dailyOtThresholdMin) {
      const overDailyOt = billedMinutes - dailyOtThresholdMin;
      dailyOtBand1Minutes = Math.min(overDailyOt, dailyOtBand1DurationMin);
      dailyOtBand2Minutes = Math.max(0, overDailyOt - dailyOtBand1DurationMin);
    }
  }

  // Per diem
  let perDiemCents = 0;
  if (ruleset.perDiemEnabled && isWorked) {
    const resolved = resolvePerDiem(day.perDiemType, billedMinutes);
    if (resolved === 'full') perDiemCents = ruleset.perDiemFullDayCents;
    else if (resolved === 'partial') perDiemCents = ruleset.perDiemPartialDayCents;
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
  };
}

/** Calculate an entire week from its day inputs and ruleset. */
export function calculateWeek(days: DayInput[], ruleset: Ruleset): WeekResult {
  const dayResults = days.map((d) => calculateDay(d, ruleset));

  // Weekly OT counting:
  //   - Weekdays: only the hours up to dailyOtStartH count toward the weekly threshold.
  //     Daily OT hours (beyond dailyOtStartH) are already accounted for by daily OT surcharge
  //     and are excluded from the weekly accumulator.
  //   - Sat/Sun/Holiday: ALL billedMinutes count toward weekly threshold (§ 5.4.3.4).
  const dailyOtThresholdMin = ruleset.dailyOtStartH * MINUTES_PER_HOUR;
  let weeklyCountMinutes = 0;

  for (const dr of dayResults) {
    if (!dr.isWorked) continue;
    const isWeekend = dr.isSaturday || dr.isSunday;
    const isHoliday = dr.isHoliday;
    if (isWeekend || isHoliday) {
      weeklyCountMinutes += dr.billedMinutes;
    } else {
      weeklyCountMinutes += Math.min(dr.billedMinutes, dailyOtThresholdMin);
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

  // Day-type surcharge totals (multiply all billedMinutes on that day type)
  const satMinutes = dayResults.filter((d) => d.isSaturday && d.isWorked).reduce((s, d) => s + d.billedMinutes, 0);
  const sunMinutes = dayResults.filter((d) => d.isSunday && d.isWorked).reduce((s, d) => s + d.billedMinutes, 0);
  const holMinutes = dayResults.filter((d) => d.isHoliday && d.isWorked).reduce((s, d) => s + d.billedMinutes, 0);

  const hourlyCents = hourlyRateCents(ruleset.weeklyRateCents, ruleset.rateType);

  // Base pay:
  //   standard/full_tarif: weekly rate is guaranteed (covers up to 50h)
  //   custom no-8h-min: bill actual hours at hourly rate
  let basePayCents: number;
  if (ruleset.dailyMinimum8h) {
    basePayCents = ruleset.weeklyRateCents;
  } else {
    // Actual hours only (custom mode)
    basePayCents = Math.round((totalBilledMinutes / MINUTES_PER_HOUR) * hourlyCents);
  }

  const dailyOtBand1Cents = surchargeCents(totalDailyOtBand1, hourlyCents, ruleset.dailyOtBand1Pct);
  const dailyOtBand2Cents = surchargeCents(totalDailyOtBand2, hourlyCents, ruleset.dailyOtBand2Pct);
  const weeklyOtBand1Cents = surchargeCents(weeklyOtBand1Minutes, hourlyCents, ruleset.weeklyOtBand1Pct);
  const weeklyOtBand2Cents = surchargeCents(weeklyOtBand2Minutes, hourlyCents, ruleset.weeklyOtBand2Pct);

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
    totalPerDiem;

  return {
    days: dayResults,
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
    totalGrossCents,
    hourlyRateCents: hourlyCents,
  };
}
