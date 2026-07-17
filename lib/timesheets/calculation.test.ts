// Unit tests for the TV FFS pay calculation engine.
// Run with: npx vitest run lib/timesheets/calculation.test.ts

import { describe, it, expect } from 'vitest';
import { calculateDay, calculateWeek } from './calculation';
import { hourlyRateCents } from './ruleset';
import { getPublicHolidays, getWeekHolidays } from './holidays';
import type { DayInput, Ruleset } from './types';

// ─── Shared helpers ────────────────────────────────────────────────────────

const BASE_RULESET: Ruleset = {
  weeklyRateCents: 200000, // €2 000.00
  rateType: 'standard',
  dailyMinimum8h: true,
  dailyOtStartH: 10,
  dailyOtBand1Pct: 25,
  dailyOtBand2Pct: 50,
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
  publicHolidays: new Set(),
};

// €2000 / 50 h = €40/h = 4000 cents/h
const HOURLY_CENTS = 4000;

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
    bundesland: null,
    perDiemType: 'none',
    ...opts,
  };
}

// ─── hourlyRateCents ───────────────────────────────────────────────────────

describe('hourly rate', () => {
  it('standard: weeklyRate / 50', () => {
    // €2000 / 50 = €40 = 4000 cents
    expect(HOURLY_CENTS).toBe(4000);
  });

  it('reduced: weeklyRate / 40', () => {
    // hourlyRate = weeklyRate / 40. €2000 / 40 = €50 = 5000 cents.
    expect(hourlyRateCents(200000, 'reduced')).toBe(5000);
    expect(hourlyRateCents(200000, 'standard')).toBe(4000);
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

  it('8 h day → billed 8 h (minimum)', () => {
    // 08:00–16:00 = 8 h, no break
    const r = calculateDay(day('2026-07-13', '08:00', '16:00'), BASE_RULESET);
    expect(r.rawWorkMinutes).toBe(480);
    expect(r.billedMinutes).toBe(480);
    expect(r.dailyOtBand1Minutes).toBe(0);
  });

  it('3 h day → billed 8 h due to daily minimum', () => {
    // 09:00–12:00 = 3 h — minimum 8 h applies
    const r = calculateDay(day('2026-07-13', '09:00', '12:00'), BASE_RULESET);
    expect(r.rawWorkMinutes).toBe(180);
    expect(r.billedMinutes).toBe(480);
  });

  it('3 h day → billed 3 h when dailyMinimum8h=false', () => {
    const ruleset = { ...BASE_RULESET, dailyMinimum8h: false };
    const r = calculateDay(day('2026-07-13', '09:00', '12:00'), ruleset);
    expect(r.billedMinutes).toBe(180);
  });

  it('break reduces raw work minutes', () => {
    // 08:00–18:00 = 10 h, break 60 min → 9 h
    const r = calculateDay(day('2026-07-13', '08:00', '18:00', { breakMinutes: 60 }), BASE_RULESET);
    expect(r.rawWorkMinutes).toBe(540);
    expect(r.billedMinutes).toBe(540);
  });
});

// ─── calculateDay — daily overtime ────────────────────────────────────────

describe('calculateDay — daily OT', () => {
  it('exactly 10 h → no daily OT', () => {
    // 08:00–18:00 = 10 h
    const r = calculateDay(day('2026-07-13', '08:00', '18:00'), BASE_RULESET);
    expect(r.billedMinutes).toBe(600);
    expect(r.dailyOtBand1Minutes).toBe(0);
    expect(r.dailyOtBand2Minutes).toBe(0);
  });

  it('11 h → 60 min daily OT band 1 (25%)', () => {
    // 08:00–19:00 = 11 h
    const r = calculateDay(day('2026-07-13', '08:00', '19:00'), BASE_RULESET);
    expect(r.billedMinutes).toBe(660);
    expect(r.dailyOtBand1Minutes).toBe(60);
    expect(r.dailyOtBand2Minutes).toBe(0);
  });

  it('13 h → 60 min band1 + 120 min band2 (50%)', () => {
    // 08:00–21:00 = 13 h
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
    // 14:00–24:00 = 10 h, 2 h night
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
    // 08:00–16:00 = 8 h work + 90 min travel = 9.5 h
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
    expect(r.billedMinutes).toBe(570);
  });

  it('qualifying travel can push into daily OT', () => {
    // 08:00–18:00 = 10 h + 90 min travel = 11.5 h → 90 min daily OT
    const r = calculateDay(
      day('2026-07-13', '08:00', '18:00', {
        travelToMinutes: 60,
        travelBackMinutes: 30,
        travelQualifies: true,
      }),
      BASE_RULESET
    );
    expect(r.totalWorkMinutes).toBe(690);
    // band1 = 60, band2 = 30
    expect(r.dailyOtBand1Minutes).toBe(60);
    expect(r.dailyOtBand2Minutes).toBe(30);
  });
});

// ─── calculateDay — per diem ───────────────────────────────────────────────

describe('calculateDay — per diem', () => {
  it('auto: <8h → no per diem', () => {
    const r = calculateDay(
      day('2026-07-13', '09:00', '16:00', { perDiemType: 'auto' }),
      BASE_RULESET
    );
    // 7h worked, dailyMinimum8h bumps billedMinutes to 480 → partial
    expect(r.perDiemCents).toBe(1400);
  });

  it('auto: ≥8h billed → partial per diem', () => {
    const r = calculateDay(
      day('2026-07-13', '08:00', '16:00', { perDiemType: 'auto' }),
      BASE_RULESET
    );
    expect(r.perDiemCents).toBe(1400);
  });

  it('full → full per diem €28', () => {
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
});

// ─── calculateWeek — daily OT only (Mon–Fri 12h/day) ─────────────────────

describe('calculateWeek — daily OT + weekly OT', () => {
  // Mon–Fri 12 h/day.
  // Daily OT per day: hour 11 = band1 (60 min), hour 12 = band2 (60 min).
  // 5 days: band1 total = 300 min, band2 total = 300 min.
  // Weekly counter: Mon–Fri capped at dailyOtStartH (10h) = 5 × 600 = 3000 min = 50h → no weekly OT.
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

  it('daily OT band2 = 300 min (5 × 60 — hour 12 only)', () => {
    // 12h day: band1 = hour 11 (60 min), band2 = hour 12 (60 min). No more OT hours.
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.days.reduce((s, d) => s + d.dailyOtBand2Minutes, 0)).toBe(300);
  });

  it('daily OT band1 surcharge = 5h × €40 × 25% = €50 = 5000 cents', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.dailyOtBand1Cents).toBe(5000);
  });

  it('daily OT band2 surcharge = 5h × €40 × 50% = €100 = 10000 cents', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.dailyOtBand2Cents).toBe(10000);
  });
});

// ─── calculateWeek — weekly OT (triggered by Saturday work) ──────────────

describe('calculateWeek — weekly OT via Saturday', () => {
  // Mon–Fri 10 h = 50 h weekly count.
  // Saturday: worked 4h → billed 8h (§ 5.2.4 daily minimum applies on weekends too).
  // weeklyCount = 50h + 8h = 58h → OT = 8h → band1 = 5h (50–55), band2 = 3h (55–58).
  const week: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'), // Mon 10h
    day('2026-07-14', '08:00', '18:00'), // Tue 10h
    day('2026-07-15', '08:00', '18:00'), // Wed 10h
    day('2026-07-16', '08:00', '18:00'), // Thu 10h
    day('2026-07-17', '08:00', '18:00'), // Fri 10h
    day('2026-07-18', '09:00', '13:00'), // Sat worked 4h → billed 8h (minimum)
    day('2026-07-19', null, null),
  ];

  it('Sat billed as 8h due to daily minimum', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.days[5].billedMinutes).toBe(480);
  });

  it('weeklyCountMinutes = 58h (50h weekdays + 8h Sat minimum)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyCountMinutes).toBe(58 * 60);
  });

  it('weeklyOtBand1 = 5h (300 min), band2 = 3h (180 min)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyOtBand1Minutes).toBe(300);
    expect(r.weeklyOtBand2Minutes).toBe(180);
  });

  it('Saturday surcharge = 8h × €40 × 25% = €80 = 8000 cents (on billed hours)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.saturdaySurchargeCents).toBe(8000);
  });

  it('weekly OT band1 surcharge = 5h × €40 × 25% = €50 = 5000 cents', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyOtBand1Cents).toBe(5000);
  });

  it('Sat + weekly OT surcharges stack (C1 answer)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    // Both surcharges apply independently to Sat hours
    expect(r.saturdaySurchargeCents).toBeGreaterThan(0);
    expect(r.weeklyOtBand1Cents).toBeGreaterThan(0);
    expect(r.weeklyOtBand2Cents).toBeGreaterThan(0);
  });
});

// ─── calculateWeek — Sunday ────────────────────────────────────────────────

describe('calculateWeek — Sunday surcharge', () => {
  // Mon–Fri 10 h, Sunday 8 h
  const week: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'),
    day('2026-07-14', '08:00', '18:00'),
    day('2026-07-15', '08:00', '18:00'),
    day('2026-07-16', '08:00', '18:00'),
    day('2026-07-17', '08:00', '18:00'),
    day('2026-07-18', null, null),
    day('2026-07-19', '08:00', '16:00'), // Sun 8h
  ];

  it('Sunday surcharge = 8h × €40 × 75% = €240 = 24000 cents', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.sundaySurchargeCents).toBe(24000);
  });

  it('Sunday hours trigger weekly OT (weeklyCount = 58h)', () => {
    const r = calculateWeek(week, BASE_RULESET);
    expect(r.weeklyCountMinutes).toBe(58 * 60);
    // 58 - 50 = 8h OT; band1 covers 50–55 = 5h; band2 = 3h
    expect(r.weeklyOtBand1Minutes).toBe(5 * 60);
    expect(r.weeklyOtBand2Minutes).toBe(3 * 60);
  });
});

// ─── calculateWeek — public holiday ───────────────────────────────────────

describe('calculateWeek — public holiday', () => {
  // Wed 2026-07-15 set as holiday (simulated)
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
    expect(r.weeklyCountMinutes).toBe(50 * 60); // still 50h
  });

  it('holiday surcharge = 10h × €40 × 100% = €400 = 40000 cents', () => {
    const r = calculateWeek(week, holidayRuleset);
    expect(r.holidaySurchargeCents).toBe(40000);
  });
});

// ─── calculateWeek — custom mode, shifted OT + no per diem ────────────────

describe('calculateWeek — custom mode (reduced rate, OT starts at 8h)', () => {
  // OT starts at 8 h (e.g. reduced rate contract variant)
  const customRuleset: Ruleset = {
    ...BASE_RULESET,
    rateType: 'reduced',
    weeklyRateCents: 160000, // 80% of 200k
    dailyOtStartH: 8,
    weeklyOtThresholdH: 40,
    weeklyOtBand1EndH: 45,
    perDiemEnabled: false,
  };
  // hourlyRate = 160000/40 = 4000 cents (same in this example)

  // Mon–Fri 10 h/day = 50 h
  const week: DayInput[] = [
    day('2026-07-13', '08:00', '18:00'),
    day('2026-07-14', '08:00', '18:00'),
    day('2026-07-15', '08:00', '18:00'),
    day('2026-07-16', '08:00', '18:00'),
    day('2026-07-17', '08:00', '18:00'),
    day('2026-07-18', null, null),
    day('2026-07-19', null, null),
  ];

  it('daily OT starts at 8h: 5 × 2h band1 (capped at 1h) + 1h band2', () => {
    const r = calculateWeek(week, customRuleset);
    // Each day: billed=600min; OT threshold=480min; over=120min
    // band1 = 60min, band2 = 60min
    r.days.slice(0, 5).forEach((d) => {
      if (d.isWorked) {
        expect(d.dailyOtBand1Minutes).toBe(60);
        expect(d.dailyOtBand2Minutes).toBe(60);
      }
    });
  });

  it('weekly OT threshold = 40h; weeklyCountMinutes = 40h (capped at 8h/day)', () => {
    const r = calculateWeek(week, customRuleset);
    // dailyOtStartH=8h → weekday cap = 8h, 5 days × 8h = 40h
    expect(r.weeklyCountMinutes).toBe(40 * 60);
    expect(r.weeklyOtBand1Minutes).toBe(0);
  });

  it('no per diem when perDiemEnabled=false', () => {
    const r = calculateWeek(week, customRuleset);
    expect(r.perDiemCents).toBe(0);
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
    const r = calculateDay(
      day('2026-07-13', '09:00', '12:00'),
      customRuleset
    );
    expect(r.billedMinutes).toBe(180);
  });

  it('base pay = actual hours × hourly rate', () => {
    // Mon–Fri each 3h = 15h total
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

// ─── calculateWeek — verify stacking of Sat + weekly OT surcharges ────────

describe('surcharge stacking', () => {
  it('Saturday hours get both Saturday AND weekly OT surcharge', () => {
    // Mon–Fri 10h = 50h weeklyCount.
    // Sat worked 6h → billed 8h (§ 5.2.4 daily minimum) → weeklyCount = 58h.
    // Weekly OT: 58 - 50 = 8h → band1 = 5h (300 min), band2 = 3h (180 min).
    // Saturday surcharge on 8h (billed): 8 × 4000 × 25% = 8000.
    // Weekly OT band1: 5 × 4000 × 25% = 5000.
    // Weekly OT band2: 3 × 4000 × 50% = 6000.
    const week: DayInput[] = [
      day('2026-07-13', '08:00', '18:00'),
      day('2026-07-14', '08:00', '18:00'),
      day('2026-07-15', '08:00', '18:00'),
      day('2026-07-16', '08:00', '18:00'),
      day('2026-07-17', '08:00', '18:00'),
      day('2026-07-18', '08:00', '14:00'), // Sat worked 6h → billed 8h
      day('2026-07-19', null, null),
    ];
    const r = calculateWeek(week, BASE_RULESET);

    expect(r.saturdaySurchargeCents).toBe(8000);
    expect(r.weeklyOtBand1Cents).toBe(5000);
    expect(r.weeklyOtBand2Cents).toBe(6000);
    // All three stack
    expect(r.saturdaySurchargeCents + r.weeklyOtBand1Cents + r.weeklyOtBand2Cents).toBe(19000);
  });
});

// ─── German public holidays smoke test ────────────────────────────────────

describe('holidays.ts', () => {
  it('BY 2026 includes Karfreitag', () => {
    // Easter 2026 is April 5; Karfreitag = April 3
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
    // Week of 2026-04-06 (Mon) — contains Ostermontag (Apr 6) but NOT Karfreitag (Apr 3)
    const h = getWeekHolidays('2026-04-06', 'DE-BY');
    expect(h.has('2026-04-06')).toBe(true);  // Ostermontag
    expect(h.has('2026-04-03')).toBe(false); // Karfreitag was previous week
  });
});
