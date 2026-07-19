// Unit tests for the TV FFS pay calculation engine.
// Run with: npx vitest run lib/timesheets/calculation.test.ts

import { describe, it, expect } from 'vitest';
import { calculateDay, calculateWeek } from './calculation';
import { hourlyRateCents } from './ruleset';
import { getPublicHolidays, getWeekHolidays } from './holidays';
import { deriveBundesland } from './location';
import type { DayInput, Ruleset } from './types';

// ─── Shared helpers ────────────────────────────────────────────────────────

const BASE_RULESET: Ruleset = {
  weeklyRateCents: 200000, // €2 000.00
  rateType: 'standard',
  dailyMinimum8h: true,
  dailyOtStartH: 10,
  dailyOtBand1Pct: 25,
  dailyOtBand2Pct: 50,
  weeklyOtEnabled: true,
  weeklyOtThresholdH: 50,
  weeklyOtBand1EndH: 55,
  weeklyOtBand1Pct: 25,
  weeklyOtBand2Pct: 50,
  nightEnabled: true,
  nightPct: 25,
  saturdayEnabled: true,
  saturdayPct: 25,
  sundayEnabled: true,
  sundayPct: 75,
  holidayEnabled: true,
  holidayPct: 100,
  perDiemEnabled: true,
  perDiemFullDayCents: 2800,
  perDiemPartialDayCents: 1400,
  homeBase: 'Berlin',
  publicHolidays: new Set(),
};

function day(
  date: string,
  workStart: string | null,
  workEnd: string | null,
  opts: Partial<Omit<DayInput, 'date' | 'workStart' | 'workEnd'>> = {}
): DayInput {
  return {
    date,
    workStart,
    workEnd,
    breakMinutes: 0,
    travelToMinutes: 0,
    travelBackMinutes: 0,
    travelQualifies: false,
    placeOfWork: null,
    bundesland: null,
    perDiemType: 'none',
    dailyMinimumOverride: null,
    ...opts,
  };
}

// ─── hourlyRateCents ───────────────────────────────────────────────────────

describe('hourly rate', () => {
  it('standard: weeklyRate / 50', () => {
    expect(hourlyRateCents(200000, 'standard')).toBe(4000);
  });

  it('reduced: weeklyRate / 40', () => {
    expect(hourlyRateCents(200000, 'reduced')).toBe(5000);
  });

  it('rounds to nearest cent', () => {
    expect(hourlyRateCents(100100, 'standard')).toBe(2002);
  });
});

// ─── calculateDay — basic work time ───────────────────────────────────────

describe('calculateDay — basic', () => {
  it('day off: all zeros', () => {
    const r = calculateDay(day('2026-07-13', null, null), BASE_RULESET);
    expect(r.isWorked).toBe(false);
    expect(r.billedMinutes).toBe(0);
    expect(r.dailyOtBand1Minutes).toBe(0);
  });

  it('8 h day → billed 10 h (dailyOtStartH minimum)', () => {
    // Minimum per called day = dailyOtStartH (10h), not 8h.
    // The weekly rate is structured around 5 × 10h = 50h.
    const r = calculateDay(day('2026-07-13', '08:00', '16:00'), BASE_RULESET);
    expect(r.rawWorkMinutes).toBe(480);
    expect(r.billedMinutes).toBe(600); // floored to 10h
    expect(r.dailyOtBand1Minutes).toBe(0);
  });

  it('3 h day → billed 10 h (dailyOtStartH minimum)', () => {
    const r = calculateDay(day('2026-07-13', '09:00', '12:00'), BASE_RULESET);
    expect(r.rawWorkMinutes).toBe(180);
    expect(r.billedMinutes).toBe(600); // floored to dailyOtStartH = 10h
  });

  it('3 h day → billed 3 h when dailyMinimum8h=false', () => {
    const ruleset = { ...BASE_RULESET, dailyMinimum8h: false };
    const r = calculateDay(day('2026-07-13', '09:00', '12:00'), ruleset);
    expect(r.billedMinutes).toBe(180);
  });

  it('per-day dailyMinimumOverride=true floors billing even when ruleset.dailyMinimum8h=false', () => {
    const ruleset = { ...BASE_RULESET, dailyMinimum8h: false };
    const r = calculateDay(
      day('2026-07-13', '09:00', '12:00', { dailyMinimumOverride: true }),
      ruleset
    );
    expect(r.billedMinutes).toBe(600); // floored to 10h despite the ruleset default being off
  });

  it('per-day dailyMinimumOverride=false bills actual hours even when ruleset.dailyMinimum8h=true', () => {
    const r = calculateDay(
      day('2026-07-13', '09:00', '12:00', { dailyMinimumOverride: false }),
      BASE_RULESET
    );
    expect(r.billedMinutes).toBe(180); // actual hours despite the ruleset default being on
  });

  it('per-day dailyMinimumOverride=null (unset) inherits the ruleset default', () => {
    const onRuleset = { ...BASE_RULESET, dailyMinimum8h: true };
    const offRuleset = { ...BASE_RULESET, dailyMinimum8h: false };
    const dayInput = day('2026-07-13', '09:00', '12:00', { dailyMinimumOverride: null });
    expect(calculateDay(dayInput, onRuleset).billedMinutes).toBe(600);
    expect(calculateDay(dayInput, offRuleset).billedMinutes).toBe(180);
  });

  it('break reduces raw work minutes', () => {
    // 10h window − 60min break = 9h actual; minimum = 10h → billed 10h
    const r = calculateDay(day('2026-07-13', '08:00', '18:00', { breakMinutes: 60 }), BASE_RULESET);
    expect(r.rawWorkMinutes).toBe(540);
    expect(r.billedMinutes).toBe(600); // floor to 10h dailyOtStartH
  });
});

// ─── calculateDay — daily overtime ────────────────────────────────────────

describe('calculateDay — daily OT', () => {
  it('exactly 10 h → no daily OT', () => {
    const r = calculateDay(day('2026-07-13', '08:00', '18:00'), BASE_RULESET);
    expect(r.billedMinutes).toBe(600);
    expect(r.dailyOtBand1Minutes).toBe(0);
    expect(r.dailyOtBand2Minutes).toBe(0);
  });

  it('11 h → 60 min daily OT band 1 (25%)', () => {
    const r = calculateDay(day('2026-07-13', '08:00', '19:00'), BASE_RULESET);
    expect(r.billedMinutes).toBe(660);
    expect(r.dailyOtBand1Minutes).toBe(60);
    expect(r.dailyOtBand2Minutes).toBe(0);
  });

  it('13 h → 60 min band1 + 120 min band2 (50%)', () => {
    const r = calculateDay(day('2026-07-13', '08:00', '21:00'), BASE_RULESET);
    expect(r.billedMinutes).toBe(780);
    expect(r.dailyOtBand1Minutes).toBe(60);
    expect(r.dailyOtBand2Minutes).toBe(120);
  });

  it('no daily OT on Saturday', () => {
    // 2026-07-18 is Saturday
    const r = calculateDay(day('2026-07-18', '08:00', '21:00'), BASE_RULESET);
    expect(r.isSaturday).toBe(true);
    expect(r.dailyOtBand1Minutes).toBe(0);
    expect(r.dailyOtBand2Minutes).toBe(0);
  });

  it('no daily OT on Sunday', () => {
    // 2026-07-19 is Sunday
    const r = calculateDay(day('2026-07-19', '08:00', '21:00'), BASE_RULESET);
    expect(r.isSunday).toBe(true);
    expect(r.dailyOtBand1Minutes).toBe(0);
  });
});

// ─── calculateDay — night surcharge ───────────────────────────────────────

describe('calculateDay — night (22:00–06:00)', () => {
  it('entirely in daytime: 0 night minutes', () => {
    const r = calculateDay(day('2026-07-13', '08:00', '18:00'), BASE_RULESET);
    expect(r.nightMinutes).toBe(0);
  });

  it('ending at midnight: 2 h night (22:00–00:00)', () => {
    const r = calculateDay(day('2026-07-13', '14:00', '24:00'), BASE_RULESET);
    expect(r.nightMinutes).toBe(120);
  });

  it('starting at midnight: 4 h night (00:00–04:00)', () => {
    const r = calculateDay(day('2026-07-13', '00:00', '04:00'), BASE_RULESET);
    expect(r.nightMinutes).toBe(240);
  });

  it('overnight 22:00–06:00: 8 h all night', () => {
    // 22:00 next day 06:00 = 8 h, all at night
    const r = calculateDay(day('2026-07-13', '22:00', '30:00'), BASE_RULESET); // 30:00 = 06:00+24h
    expect(r.nightMinutes).toBe(480);
  });
});

// ─── calculateDay — travel time ────────────────────────────────────────────

describe('calculateDay — travel', () => {
  it('travel not qualifying: 0 travel minutes', () => {
    const r = calculateDay(
      day('2026-07-13', '09:00', '17:00', { travelToMinutes: 60, travelQualifies: false }),
      BASE_RULESET
    );
    expect(r.travelMinutes).toBe(0);
    expect(r.totalWorkMinutes).toBe(480);
  });

  it('qualifying travel adds to work minutes', () => {
    // 8h work + 90min travel = 9.5h actual; minimum = 10h → billed 10h
    const r = calculateDay(
      day('2026-07-13', '08:00', '16:00', {
        travelToMinutes: 60,
        travelBackMinutes: 30,
        travelQualifies: true,
      }),
      BASE_RULESET
    );
    expect(r.travelMinutes).toBe(90);
    expect(r.totalWorkMinutes).toBe(570);
    expect(r.billedMinutes).toBe(600); // floor to 10h
  });

  it('§ 12.4 TV FFS: qualifying travel is billed but never triggers daily OT surcharge', () => {
    // 08:00–18:00 = 10 h raw work (exactly at the dailyOtStartH threshold) + 90 min
    // qualifying travel = 11.5 h billed. The 90 min over the threshold is entirely
    // travel, so it must be paid at base rate with zero OT surcharge — travel is
    // "wie Arbeitszeit... jedoch ohne jegliche Zuschläge" (§ 12.4), not exempt from
    // billing but exempt from every surcharge.
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', {
        travelToMinutes: 60,
        travelBackMinutes: 30,
        travelQualifies: true,
      }),
      BASE_RULESET
    );
    expect(r.totalWorkMinutes).toBe(690);
    expect(r.billedMinutes).toBe(690); // travel is still billed at base rate
    expect(r.dailyOtBand1Minutes).toBe(0);
    expect(r.dailyOtBand2Minutes).toBe(0);
  });

  it('§ 12.4 TV FFS: raw work beyond the threshold still gets daily OT even with travel on top', () => {
    // 08:00–20:00 = 12 h raw work (2h over the 10h threshold) + 30 min qualifying
    // travel = 12.5 h billed. Only the 2h of real overtime work gets the OT
    // surcharge (1h band1 + 1h band2); the 30 min of travel gets none.
    const r = calculateDay(
      day('2026-07-13', '08:00', '20:00', {
        travelToMinutes: 30,
        travelQualifies: true,
      }),
      BASE_RULESET
    );
    expect(r.rawWorkMinutes).toBe(720); // 12h
    expect(r.billedMinutes).toBe(750);  // 12.5h (includes the 30min travel)
    expect(r.dailyOtBand1Minutes).toBe(60);  // hour 11
    expect(r.dailyOtBand2Minutes).toBe(60);  // hour 12
  });
});

// ─── Bug #3: per-diem auto threshold (§ 12.2 TV FFS) ─────────────────────
//
// The threshold uses actual work time (totalWorkMinutes), NOT the
// minimum-billing floor (billedMinutes). A 7h actual day that is billed
// as 8h due to the minimum must NOT trigger a partial per diem.

describe('calculateDay — per diem auto threshold (Bug #3)', () => {
  it('auto: 7h actual → no per diem even though billed to dailyOtStartH (10h)', () => {
    // 09:00–16:00 = 7h actual, billed to 10h (dailyOtStartH) by daily minimum
    // § 12.2 TV FFS: threshold is actual absence time, NOT the billing floor
    const r = calculateDay(
      day('2026-07-13', '09:00', '16:00', { perDiemType: 'auto' }),
      BASE_RULESET
    );
    expect(r.totalWorkMinutes).toBe(420); // 7h actual
    expect(r.billedMinutes).toBe(600);    // floored to 10h
    expect(r.perDiemCents).toBe(0);       // no per diem: 7h actual < 8h threshold
  });

  it('auto: exactly 8h actual → partial per diem', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '16:00', { perDiemType: 'auto' }),
      BASE_RULESET
    );
    expect(r.totalWorkMinutes).toBe(480);
    expect(r.perDiemCents).toBe(1400); // partial
  });

  it('auto: 10h actual → partial per diem', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto' }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(1400);
  });

  it('full → full per diem €28 regardless of hours', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '16:00', { perDiemType: 'full' }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(2800);
  });

  it('none → 0', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '16:00', { perDiemType: 'none' }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(0);
  });
});

// ─── Bug #2: per-diem suppressed for local bookings (§ 12.2 TV FFS) ───────

describe('calculateDay — home base per diem suppression (Bug #2)', () => {
  it('Berlin place of work suppresses per diem (home base = Berlin)', () => {
    // Worked 10h in Berlin — local booking, no per diem owed
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', {
        perDiemType: 'auto',
        placeOfWork: 'Berlin',
      }),
      BASE_RULESET // homeBase = 'Berlin'
    );
    expect(r.perDiemCents).toBe(0);
  });

  it('case-insensitive: "berlin" also suppresses', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: 'berlin' }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(0);
  });

  it('different city (Hamburg) → per diem applies', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: 'Hamburg' }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(1400); // partial per diem
  });

  it('null place of work → per diem applies (location unknown)', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: null }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(1400);
  });

  it('custom home base: Frankfurt — Berlin triggers per diem, Frankfurt suppresses', () => {
    const frankfurtRuleset: Ruleset = { ...BASE_RULESET, homeBase: 'Frankfurt' };

    const rBerlin = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: 'Berlin' }),
      frankfurtRuleset
    );
    const rFrankfurt = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: 'Frankfurt' }),
      frankfurtRuleset
    );

    expect(rBerlin.perDiemCents).toBe(1400);   // away from Frankfurt → per diem
    expect(rFrankfurt.perDiemCents).toBe(0);   // home base → no per diem
  });
});

// ─── calculateWeek — normal week (Mon–Fri, 10 h/day) ─────────────────────

describe('calculateWeek — normal week', () => {
  // Week of 2026-07-13 (Mon–Fri), 10 h/day = 50 h exactly, no OT
  const normalWeek: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'), // Mon 10h
    day('2026-07-14', '08:00', '18:00'), // Tue 10h
    day('2026-07-15', '08:00', '18:00'), // Wed 10h
    day('2026-07-16', '08:00', '18:00'), // Thu 10h
    day('2026-07-17', '08:00', '18:00'), // Fri 10h
    day('2026-07-18', null, null),        // Sat off
    day('2026-07-19', null, null),        // Sun off
  ];

  it('50 h total billed', () => {
    const r = calculateWeek(normalWeek, BASE_RULESET);
    expect(r.totalBilledMinutes).toBe(50 * 60);
  });

  it('no weekly OT', () => {
    const r = calculateWeek(normalWeek, BASE_RULESET);
    expect(r.weeklyOtBand1Minutes).toBe(0);
    expect(r.weeklyOtBand2Minutes).toBe(0);
  });

  it('no daily OT', () => {
    const r = calculateWeek(normalWeek, BASE_RULESET);
    expect(r.dailyOtBand1Cents).toBe(0);
    expect(r.dailyOtBand2Cents).toBe(0);
  });

  it('base pay = weekly rate', () => {
    const r = calculateWeek(normalWeek, BASE_RULESET);
    expect(r.basePayCents).toBe(200000);
  });

  it('total gross = base only', () => {
    const r = calculateWeek(normalWeek, BASE_RULESET);
    expect(r.totalGrossCents).toBe(200000);
  });

  it('no rest violations', () => {
    const r = calculateWeek(normalWeek, BASE_RULESET);
    expect(r.restViolationCents).toBe(0);
  });
});

// ─── calculateWeek — daily OT + weekly OT ────────────────────────────────

describe('calculateWeek — daily OT + weekly OT', () => {
  // Mon–Fri 12 h/day.
  // Daily OT per day: band1=60min, band2=60min.
  // Weekly counter: Mon–Fri capped at dailyOtStartH (10h) = 5×600 = 3000 min = 50h → no weekly OT.
  const week: DayInput[] = [
    day('2026-07-13', '06:00', '18:00'), // Mon 12h
    day('2026-07-14', '06:00', '18:00'), // Tue 12h
    day('2026-07-15', '06:00', '18:00'), // Wed 12h
    day('2026-07-16', '06:00', '18:00'), // Thu 12h
    day('2026-07-17', '06:00', '18:00'), // Fri 12h
    day('2026-07-18', null, null),
    day('2026-07-19', null, null),
  ];

  it('weeklyCountMinutes = 50h (capped at dailyOtStartH per day)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyCountMinutes).toBe(50 * 60);
  });

  it('no weekly OT when daily hours capped for counter', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyOtBand1Minutes).toBe(0);
    expect(r.weeklyOtBand2Minutes).toBe(0);
  });

  it('daily OT band1 = 300 min (5 × 60)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.days.reduce((s, d) => s + d.dailyOtBand1Minutes, 0)).toBe(300);
  });

  it('daily OT band2 = 300 min (5 × 60)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.days.reduce((s, d) => s + d.dailyOtBand2Minutes, 0)).toBe(300);
  });

  it('daily OT band1 surcharge = 5h × €40 × 25% = €50', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.dailyOtBand1Cents).toBe(5000);
  });

  it('daily OT band2 surcharge = 5h × €40 × 50% = €100', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.dailyOtBand2Cents).toBe(10000);
  });

  it('base pay rises to actual-hours value once daily OT pushes the week past 50h — the flat rate is a floor, not a cap', () => {
    // 60h billed total (5 × 12h) is worth more than the €2000 flat rate at
    // €40/h, so basePayCents must reflect the actual hours, not just the
    // flat guarantee — otherwise the 10 daily-OT hours' base pay (as
    // opposed to just their 25%/50% Zuschlag) would silently vanish.
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.basePayCents).toBe(240000); // 60h × €40
    expect(r.totalGrossCents).toBe(240000 + 5000 + 10000); // base + band1 + band2
  });
});

// ─── calculateWeek — weekly OT via Saturday ───────────────────────────────

describe('calculateWeek — weekly OT via Saturday', () => {
  const week: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'), // Mon 10h
    day('2026-07-14', '08:00', '18:00'), // Tue 10h
    day('2026-07-15', '08:00', '18:00'), // Wed 10h
    day('2026-07-16', '08:00', '18:00'), // Thu 10h
    day('2026-07-17', '08:00', '18:00'), // Fri 10h
    day('2026-07-18', '09:00', '13:00'), // Sat worked 4h → billed 8h (minimum)
    day('2026-07-19', null, null),
  ];

  it('Sat billed as 10h due to dailyOtStartH minimum', () => {
    // Sat 4h worked → floored to dailyOtStartH (10h)
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.days[5].billedMinutes).toBe(600);
  });

  it('weeklyCountMinutes = 60h (50h weekdays + 10h Sat minimum)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyCountMinutes).toBe(60 * 60);
  });

  it('weeklyOtBand1 = 5h (300 min), band2 = 5h (300 min)', () => {
    // 60h - 50h = 10h OT. band1 = 50h→55h = 5h; band2 = 55h+ = 5h
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyOtBand1Minutes).toBe(300);
    expect(r.weeklyOtBand2Minutes).toBe(300);
  });

  it('Saturday surcharge = 10h × €40 × 25% = €100', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.saturdaySurchargeCents).toBe(10000);
  });

  it('weekly OT band1 surcharge = 5h × €40 × 25% = €50', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyOtBand1Cents).toBe(5000);
  });

  it('no rest violation for Mon–Sat (≥11h rest each night)', () => {
    // 18:00 to 08:00 next day = 14h → no violation
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.restViolationCents).toBe(0);
  });

  it('weeklyOtEnabled=false (custom mode) zeroes the weekly OT surcharge but leaves the Saturday surcharge and weekly-OT minute tracking untouched', () => {
    // § 5.4.3.1/5.4.3.4 TV FFS treats 6th/7th-day work as weekly overtime in
    // addition to (not instead of) the flat Saturday surcharge (§ 5.6.4) — two
    // independent, stackable mechanisms. Disabling one must not disable the other.
    const ruleset = { ...BASE_RULESET, weeklyOtEnabled: false };
    const r = calculateWeek(week, ruleset);
    expect(r.weeklyOtBand1Cents).toBe(0);
    expect(r.weeklyOtBand2Cents).toBe(0);
    // Minutes are still tracked (e.g. for display), only the surcharge cents are gated.
    expect(r.weeklyOtBand1Minutes).toBe(300);
    expect(r.weeklyOtBand2Minutes).toBe(300);
    // Saturday's own flat surcharge (§ 5.6.4) is unaffected — separate mechanism.
    expect(r.saturdaySurchargeCents).toBe(10000);
  });

  it('with all surcharges enabled, base pay reflects the actual 60h worked (not just the flat rate)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.basePayCents).toBe(240000); // 60h × €40, exceeds the €2000 flat rate
    expect(r.totalGrossCents).toBe(240000 + 5000 + 10000 + 10000); // base + weekly OT band1/2 + Saturday
  });

  it('disabling BOTH weeklyOtEnabled and saturdayEnabled still pays the 6th day at 100% base rate — a Zuschlag toggle controls only the premium, never the underlying pay for hours worked', () => {
    // This is the exact real-world bug report: a 6-day, 60h week with both
    // premiums switched off in custom mode was paying out only the flat
    // €2000 rate, as if the Saturday had been worked for free. It must
    // instead pay for the 10 extra hours at the plain hourly rate.
    const ruleset = { ...BASE_RULESET, weeklyOtEnabled: false, saturdayEnabled: false };
    const r = calculateWeek(week, ruleset);
    expect(r.weeklyOtBand1Cents).toBe(0);
    expect(r.weeklyOtBand2Cents).toBe(0);
    expect(r.saturdaySurchargeCents).toBe(0);
    expect(r.basePayCents).toBe(240000); // €2000 flat rate + 10h × €40 = €2400
    expect(r.totalGrossCents).toBe(240000);
  });
});

// ─── § 12.4 TV FFS: qualifying travel is excluded from day-type surcharges ──

describe('calculateWeek — § 12.4 travel excluded from Saturday surcharge', () => {
  const week: DayInput[] = [
    day('2026-07-13', null, null),
    day('2026-07-14', null, null),
    day('2026-07-15', null, null),
    day('2026-07-16', null, null),
    day('2026-07-17', null, null),
    // Sat: 8h raw work + 2h qualifying travel = 10h billed (exactly the floor)
    day('2026-07-18', '08:00', '16:00', {
      travelToMinutes: 60,
      travelBackMinutes: 60,
      travelQualifies: true,
    }),
    day('2026-07-19', null, null),
  ];

  it('Saturday surcharge applies only to the 8h raw work, not the 2h travel', () => {
    const r = calculateWeek(week, BASE_RULESET);
    // 8h × €40/h × 25% = €80 (NOT 10h × €40 × 25% = €100, which would
    // incorrectly surcharge the travel time)
    expect(r.saturdaySurchargeCents).toBe(8000);
  });

  it('weeklyCountMinutes excludes the travel portion too', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyCountMinutes).toBe(480); // 8h, not 10h
  });

  it('billedMinutes (base pay) still includes the travel time', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.days[5].billedMinutes).toBe(600); // 10h — travel is still paid
  });
});

// ─── § 5.2.2 / § 12.4 TV FFS: travel extends the rest-period window ────────

describe('calculateWeek — travel time counts toward rest-period violations', () => {
  it('travel_back shrinks an apparently-compliant rest gap into a violation', () => {
    // Raw times alone: Mon ends 20:00, Tue starts 08:00 → 12h gap, compliant.
    // But Mon has 90min of qualifying travel_back, which is Arbeitszeit per
    // § 5.2.2/§ 12.4, extending Mon's effective end to 21:30 → real gap is
    // only 10.5h, a genuine rest-period violation.
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '20:00', {
          travelBackMinutes: 90,
          travelQualifies: true,
        }),
        day('2026-07-14', '08:00', '18:00'),
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBeGreaterThan(0);
    expect(r.days[0].restViolationMinutes).toBe(30); // 11h - 10.5h shortfall
  });

  it('travel_to on the next day also shrinks the rest gap', () => {
    // Mon ends 20:00, Tue's raw start is 08:00 (12h gap, compliant), but Tue
    // has 90min of qualifying travel_to beforehand, pulling Tue's effective
    // start back to 06:30 → real gap is only 10.5h.
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '20:00'),
        day('2026-07-14', '08:00', '18:00', {
          travelToMinutes: 90,
          travelQualifies: true,
        }),
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBeGreaterThan(0);
    expect(r.days[0].restViolationMinutes).toBe(30);
  });

  it('non-qualifying travel does not affect the rest gap', () => {
    // Same 90min travel_back as the first test, but travelQualifies=false —
    // must NOT be treated as Arbeitszeit for rest-period purposes.
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '20:00', {
          travelBackMinutes: 90,
          travelQualifies: false,
        }),
        day('2026-07-14', '08:00', '18:00'),
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBe(0);
  });
});

// ─── Bug #5: dayTotalCents includes base + surcharge (not just surcharge) ──

describe('dayTotalCents — full OT hour value (Bug #5)', () => {
  it('10h day: dayTotalCents = 10h × €40 = €400', () => {
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '18:00'),
        ...Array.from({ length: 6 }, (_, i) => day(`2026-07-1${i + 4}`, null, null)),
      ],
      BASE_RULESET
    );
    // Mon 10h: base = 10 × 4000c = 40000c = €400
    expect(r.days[0].dayTotalCents).toBe(40000);
  });

  it('11h day: dayTotalCents = 11h × €40 + 1h × 25% = €440 + €10 = €450', () => {
    // The OT hour (11th) shows its full value: base (€40) + surcharge (€10) = €50
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '19:00'), // Mon 11h
        ...Array.from({ length: 6 }, (_, i) => day(`2026-07-1${i + 4}`, null, null)),
      ],
      BASE_RULESET
    );
    // 11 × 4000 + 60min × 25% surcharge = 44000 + 1000 = 45000c = €450
    expect(r.days[0].dayTotalCents).toBe(45000);
  });

  it('Saturday 8h worked: dayTotalCents = 10h × €40 + 10h × 25% sat = €400 + €100 = €500', () => {
    // 8h actual work → floored to 10h (dailyOtStartH); all 10h get the Sat surcharge
    const r = calculateWeek(
      [
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-1${i + 3}`, null, null)),
        day('2026-07-18', '08:00', '16:00'), // Sat 8h → billed 10h
        day('2026-07-19', null, null),
      ],
      BASE_RULESET
    );
    expect(r.days[5].dayTotalCents).toBe(40000 + 10000); // 10h × €40 + 10h × 25% = €500
  });

  it('off day: dayTotalCents = 0', () => {
    const r = calculateWeek(
      Array.from({ length: 7 }, (_, i) => day(`2026-07-${13 + i}`, null, null)),
      BASE_RULESET
    );
    expect(r.days.every(d => d.dayTotalCents === 0)).toBe(true);
  });
});

// ─── Bug #7: rest-period violation (ArbZG § 5 / TV FFS § 5.8) ─────────────

describe('calculateWeek — rest period violations (Bug #7)', () => {
  it('no violation when rest ≥ 11h', () => {
    // Mon 08:00–18:00, Tue 08:00–18:00: 14h rest → OK
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '18:00'),
        day('2026-07-14', '08:00', '18:00'),
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBe(0);
    expect(r.days[0].restViolationMinutes).toBe(0);
  });

  it('violation when rest < 11h: Mon 08:00–22:00, Tue 06:00', () => {
    // Mon ends 22:00 → Tue starts 06:00: gap = 24h - 22h + 6h = 8h < 11h
    // Shortfall = 3h = 180 min → compensation = 3 × 4000c = 12000c = €120
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '22:00'), // Mon ends 22:00
        day('2026-07-14', '06:00', '16:00'), // Tue starts 06:00 — only 8h rest!
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBe(12000); // 3h × €40/h = €120
    expect(r.days[0].restViolationMinutes).toBe(180); // 3h shortfall on Mon
    expect(r.days[0].restViolationCents).toBe(12000);
  });

  it('overnight work violation: Mon 06:00–02:00, Tue 08:00', () => {
    // Mon end = 02:00 (next day, stored as 26:00 = 02:00 + 24h logic)
    // Gap to Tue 08:00: Tue 08:00 is 08h into the next calendar day
    // actualEnd for Mon = 02:00 (works past midnight, so adjustedEnd = 2*60 + 24*60 = 1560 min)
    // gap = 24*60 - 1560 + 480 (Tue 08:00) = 1440 - 1560 + 480 = 360 min = 6h
    // Shortfall = 11h - 6h = 5h = 300 min → 5 × 4000c = 20000c = €200
    const r = calculateWeek(
      [
        day('2026-07-13', '06:00', '02:00'), // Mon 20h, past midnight
        day('2026-07-14', '08:00', '18:00'), // Tue starts at 08:00 — only 6h rest!
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBe(20000); // 5h × €40/h = €200
  });

  it('non-consecutive worked days: no violation', () => {
    // Mon and Wed worked; Tuesday off → rest > 11h → no violation
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '22:00'), // Mon ends 22:00
        day('2026-07-14', null, null),         // Tue off (>11h rest)
        day('2026-07-15', '06:00', '16:00'),  // Wed starts 06:00
        ...Array.from({ length: 4 }, (_, i) => day(`2026-07-${16 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBe(0);
  });

  it('totalGrossCents includes rest violation pay', () => {
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '22:00'),
        day('2026-07-14', '06:00', '16:00'),
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${15 + i}`, null, null)),
      ],
      BASE_RULESET
    );
    expect(r.restViolationCents).toBeGreaterThan(0); // rest violation exists
    // totalGrossCents must include all components, including restViolationCents
    expect(r.totalGrossCents).toBe(
      r.basePayCents +
      r.dailyOtBand1Cents + r.dailyOtBand2Cents +
      r.weeklyOtBand1Cents + r.weeklyOtBand2Cents +
      r.nightSurchargeCents + r.saturdaySurchargeCents +
      r.sundaySurchargeCents + r.holidaySurchargeCents +
      r.perDiemCents + r.restViolationCents
    );
  });
});

// ─── Bug #1: custom mode overrides feed into calculation ──────────────────

describe('calculateWeek — custom mode overrides (Bug #1)', () => {
  const customRuleset: Ruleset = {
    ...BASE_RULESET,
    rateType: 'reduced',
    weeklyRateCents: 160000,
    dailyOtStartH: 8,       // OT starts at hour 9 (overridden from 10)
    weeklyOtThresholdH: 40, // weekly threshold 40h (overridden from 50)
    weeklyOtBand1EndH: 45,
    perDiemEnabled: false,
    homeBase: 'München',    // different home base
  };

  it('daily OT starts at 8h: 10h day → 2h daily OT', () => {
    const r = calculateWeek(
      [
        day('2026-07-13', '08:00', '18:00'),
        ...Array.from({ length: 6 }, (_, i) => day(`2026-07-${14 + i}`, null, null)),
      ],
      customRuleset
    );
    // 10h billed, OT threshold = 8h → 2h over
    // band1 = 60min (hour 9), band2 = 60min (hour 10)
    expect(r.days[0].dailyOtBand1Minutes).toBe(60);
    expect(r.days[0].dailyOtBand2Minutes).toBe(60);
  });

  it('weekly OT threshold = 40h: 5×10h weekdays reach the threshold exactly (no weekly OT)', () => {
    // dailyOtStartH=8h → weekly counter caps each weekday at 8h → 5×8h = 40h = threshold
    const week: DayInput[] = [
      day('2026-07-13', '08:00', '18:00'),
      day('2026-07-14', '08:00', '18:00'),
      day('2026-07-15', '08:00', '18:00'),
      day('2026-07-16', '08:00', '18:00'),
      day('2026-07-17', '08:00', '18:00'),
      day('2026-07-18', null, null),
      day('2026-07-19', null, null),
    ];
    const r = calculateWeek(week, customRuleset);
    expect(r.weeklyCountMinutes).toBe(40 * 60);
    expect(r.weeklyOtBand1Minutes).toBe(0);
  });

  it('custom home base München: München suppresses per diem, Berlin does not', () => {
    const rulesetPdEnabled = { ...customRuleset, perDiemEnabled: true };
    const rMünchen = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: 'München' }),
      rulesetPdEnabled
    );
    const rBerlin = calculateDay(
      day('2026-07-13', '08:00', '18:00', { perDiemType: 'auto', placeOfWork: 'Berlin' }),
      rulesetPdEnabled
    );
    expect(rMünchen.perDiemCents).toBe(0);    // home base → suppressed
    expect(rBerlin.perDiemCents).toBe(1400);  // away → partial per diem
  });

  it('night surcharge disabled in custom rules', () => {
    const noNight: Ruleset = { ...BASE_RULESET, nightEnabled: false };
    const r = calculateDay(
      day('2026-07-13', '14:00', '24:00'), // 2h night
      noNight
    );
    expect(r.nightMinutes).toBe(120); // still detected
    // but in calculateWeek the surcharge would be 0 — check via dayTotalCents
    const weekResult = calculateWeek(
      [day('2026-07-13', '14:00', '24:00'), ...Array.from({ length: 6 }, (_, i) => day(`2026-07-${14 + i}`, null, null))],
      noNight
    );
    expect(weekResult.nightSurchargeCents).toBe(0);
  });

  it('saturday surcharge disabled: no sat surcharge paid', () => {
    const noSat: Ruleset = { ...BASE_RULESET, saturdayEnabled: false };
    const weekResult = calculateWeek(
      [
        ...Array.from({ length: 5 }, (_, i) => day(`2026-07-${13 + i}`, null, null)),
        day('2026-07-18', '08:00', '16:00'), // Sat 8h
        day('2026-07-19', null, null),
      ],
      noSat
    );
    expect(weekResult.saturdaySurchargeCents).toBe(0);
  });
});

// ─── Bug #8: Bundesland derived from place of work ────────────────────────

describe('deriveBundesland (Bug #8)', () => {
  it('Berlin → DE-BE', () => {
    expect(deriveBundesland('Berlin')).toBe('DE-BE');
  });

  it('case-insensitive: berlin → DE-BE', () => {
    expect(deriveBundesland('berlin')).toBe('DE-BE');
  });

  it('München → DE-BY', () => {
    expect(deriveBundesland('München')).toBe('DE-BY');
  });

  it('Hamburg → DE-HH', () => {
    expect(deriveBundesland('Hamburg')).toBe('DE-HH');
  });

  it('Frankfurt → DE-HE', () => {
    expect(deriveBundesland('Frankfurt')).toBe('DE-HE');
  });

  it('Frankfurt am Main → DE-HE', () => {
    expect(deriveBundesland('Frankfurt am Main')).toBe('DE-HE');
  });

  it('Köln → DE-NW', () => {
    expect(deriveBundesland('Köln')).toBe('DE-NW');
  });

  it('unknown city → null', () => {
    expect(deriveBundesland('Atlantis')).toBeNull();
  });

  it('empty string → null', () => {
    expect(deriveBundesland('')).toBeNull();
  });

  it('Bundesland determines correct holidays: BE has Frauentag (Mar 8)', () => {
    const beHolidays = getPublicHolidays(2026, 'DE-BE');
    const byHolidays = getPublicHolidays(2026, 'DE-BY');
    expect(beHolidays.has('2026-03-08')).toBe(true);  // Berlin Frauentag
    expect(byHolidays.has('2026-03-08')).toBe(false); // Bavaria does not have it
  });
});

// ─── calculateWeek — Sunday ────────────────────────────────────────────────

describe('calculateWeek — Sunday surcharge', () => {
  const week: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'),
    day('2026-07-14', '08:00', '18:00'),
    day('2026-07-15', '08:00', '18:00'),
    day('2026-07-16', '08:00', '18:00'),
    day('2026-07-17', '08:00', '18:00'),
    day('2026-07-18', null, null),
    day('2026-07-19', '08:00', '16:00'), // Sun 8h
  ];

  it('Sunday surcharge = 10h × €40 × 75% = €300', () => {
    // Sun 8h worked → floored to 10h
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.sundaySurchargeCents).toBe(30000);
  });

  it('Sunday hours trigger weekly OT (weeklyCount = 60h)', () => {
    // 50h weekdays + 10h Sun minimum = 60h. OT = 10h. band1 = 5h, band2 = 5h.
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyCountMinutes).toBe(60 * 60);
    expect(r.weeklyOtBand1Minutes).toBe(5 * 60);
    expect(r.weeklyOtBand2Minutes).toBe(5 * 60);
  });
});

// ─── calculateWeek — public holiday ───────────────────────────────────────

describe('calculateWeek — public holiday', () => {
  const holidayRuleset: Ruleset = {
    ...BASE_RULESET,
    publicHolidays: new Set(['2026-07-15']),
  };

  const week: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'),
    day('2026-07-14', '08:00', '18:00'),
    day('2026-07-15', '08:00', '18:00'), // holiday 10h
    day('2026-07-16', '08:00', '18:00'),
    day('2026-07-17', '08:00', '18:00'),
    day('2026-07-18', null, null),
    day('2026-07-19', null, null),
  ];

  it('holiday detected', () => {
    const r = calculateWeek(week, holidayRuleset);
    expect(r.days[2].isHoliday).toBe(true);
  });

  it('no daily OT on holiday', () => {
    const r = calculateWeek(week, holidayRuleset);
    expect(r.days[2].dailyOtBand1Minutes).toBe(0);
  });

  it('holiday hours count toward weekly OT', () => {
    const r = calculateWeek(week, holidayRuleset);
    expect(r.weeklyCountMinutes).toBe(50 * 60);
  });

  it('holiday surcharge = 10h × €40 × 100% = €400', () => {
    const r = calculateWeek(week, holidayRuleset);
    expect(r.holidaySurchargeCents).toBe(40000);
  });
});

// ─── calculateWeek — custom mode without dailyMinimum8h ───────────────────

describe('calculateWeek — custom no 8h minimum', () => {
  const customRuleset: Ruleset = {
    ...BASE_RULESET,
    dailyMinimum8h: false,
    perDiemEnabled: false,
  };

  it('3h day billed as 3h (no floor)', () => {
    const r = calculateDay(day('2026-07-13', '09:00', '12:00'), customRuleset);
    expect(r.billedMinutes).toBe(180);
  });

  it('base pay = actual hours × hourly rate', () => {
    const week: DayInput[] = [
      day('2026-07-13', '09:00', '12:00'),
      day('2026-07-14', '09:00', '12:00'),
      day('2026-07-15', '09:00', '12:00'),
      day('2026-07-16', '09:00', '12:00'),
      day('2026-07-17', '09:00', '12:00'),
      day('2026-07-18', null, null),
      day('2026-07-19', null, null),
    ];
    const r = calculateWeek(week, customRuleset);
    // 15h × 4000 cents/h = 60000 cents = €600
    expect(r.basePayCents).toBe(60000);
  });
});

// ─── surcharge stacking ────────────────────────────────────────────────────

describe('surcharge stacking', () => {
  it('Saturday hours get both Saturday AND weekly OT surcharge', () => {
    const week: DayInput[] = [
      day('2026-07-13', '08:00', '18:00'),
      day('2026-07-14', '08:00', '18:00'),
      day('2026-07-15', '08:00', '18:00'),
      day('2026-07-16', '08:00', '18:00'),
      day('2026-07-17', '08:00', '18:00'),
      day('2026-07-18', '08:00', '14:00'), // Sat worked 6h → billed 10h
      day('2026-07-19', null, null),
    ];
    const r = calculateWeek(week, BASE_RULESET);

    // Sat billed 10h: 10h × €40 × 25% = €100
    expect(r.saturdaySurchargeCents).toBe(10000);
    // 50h weekdays + 10h Sat = 60h. band1 = 5h × €40 × 25% = €50
    expect(r.weeklyOtBand1Cents).toBe(5000);
    // band2 = 5h × €40 × 50% = €100
    expect(r.weeklyOtBand2Cents).toBe(10000);
  });
});

// ─── German public holidays smoke test ────────────────────────────────────

describe('holidays.ts', () => {
  it('BY 2026 includes Karfreitag', () => {
    const h = getPublicHolidays(2026, 'DE-BY');
    expect(h.has('2026-04-03')).toBe(true);
  });

  it('BY 2026 includes Heilige Drei Könige (Jan 6)', () => {
    expect(getPublicHolidays(2026, 'DE-BY').has('2026-01-06')).toBe(true);
  });

  it('BE does NOT have Heilige Drei Könige', () => {
    expect(getPublicHolidays(2026, 'DE-BE').has('2026-01-06')).toBe(false);
  });

  it('getWeekHolidays returns only the holidays in that week', () => {
    const h = getWeekHolidays('2026-04-06', 'DE-BY');
    expect(h.has('2026-04-06')).toBe(true);  // Ostermontag
    expect(h.has('2026-04-03')).toBe(false); // Karfreitag was previous week
  });
});
