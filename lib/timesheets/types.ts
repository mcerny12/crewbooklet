// Shared TypeScript types for the Timesheets module.
// These mirror the DB schema exactly so SupabaseService can return rows as-is.

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

export type TimesheetStatus = 'draft' | 'submitted' | 'approved';

/**
 * Printed timesheet form, chosen per project (projects.timesheet_template).
 * Lives here rather than in print/templates.ts so client components can import
 * it without pulling pdf-lib and node:path into the browser bundle.
 */
export type TimesheetTemplateId = 'default' | 'wbfilm';

export const TIMESHEET_TEMPLATE_IDS: TimesheetTemplateId[] = ['default', 'wbfilm'];

export const DEFAULT_TIMESHEET_TEMPLATE: TimesheetTemplateId = 'default';

/** Form names as printed on the templates — product names, never translated. */
export const TIMESHEET_TEMPLATE_LABELS: Record<TimesheetTemplateId, string> = {
  default: 'Standard (Stundenzettel)',
  wbfilm: 'Wiedemann & Berg (WBFilmTSVorlage)',
};

/**
 * Which printed form a timesheet exports to. The form belongs to the client,
 * so an organization sets the default for all its productions and a single
 * project can still override it:
 *
 *   project override ?? client organization default ?? 'default'
 *
 * Both inputs are nullable — a project with no client, or a client with no
 * preference, lands on the original Stundenzettel.
 */
export function resolveTimesheetTemplate(
  projectTemplate: TimesheetTemplateId | null | undefined,
  organizationTemplate: TimesheetTemplateId | null | undefined
): TimesheetTemplateId {
  return projectTemplate ?? organizationTemplate ?? DEFAULT_TIMESHEET_TEMPLATE;
}

export type CalcMode = 'full_tarif' | 'custom_tarif';
export type RateType = 'standard' | 'reduced';
export type PerDiemType = 'auto' | 'partial' | 'full' | 'none';

/** Shape of the `custom_rules` JSONB column on `timesheets`. */
export interface CustomRulesOverride {
  dailyOtStartH?: number;       // h/day before OT starts; TV FFS default: 10
  dailyOtBand1Pct?: number;     // surcharge for hours in band 1; TV FFS: 25
  dailyOtBand2Pct?: number;     // surcharge for hours in band 2; TV FFS: 50
  weeklyOtEnabled?: boolean;    // weekly OT surcharge on/off; TV FFS default: true (§ 5.4.3.1/5.4.3.3)
  weeklyOtThresholdH?: number;  // weekly h before OT kicks in; TV FFS: 50
  weeklyOtBand1EndH?: number;   // weekly h where band 1 ends; TV FFS: 55
  weeklyOtBand1Pct?: number;    // weekly OT band 1 surcharge; TV FFS: 25
  weeklyOtBand2Pct?: number;    // weekly OT band 2 surcharge; TV FFS: 50
  nightEnabled?: boolean;       // night surcharge on/off; TV FFS default: true
  nightPct?: number;            // night-time surcharge; TV FFS: 25
  saturdayEnabled?: boolean;    // Saturday surcharge on/off; TV FFS default: true
  saturdayPct?: number;         // Saturday surcharge; TV FFS: 25
  sundayEnabled?: boolean;      // Sunday surcharge on/off; TV FFS default: true
  sundayPct?: number;           // Sunday surcharge; TV FFS: 75
  holidayEnabled?: boolean;     // holiday surcharge on/off; TV FFS default: true
  holidayPct?: number;          // Public holiday surcharge; TV FFS: 100
  homeBase?: string;            // Home location for per-diem eligibility; default: 'Berlin'
}

export interface Timesheet {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  project_id: string | null;
  week_start: string; // 'YYYY-MM-DD' — Monday of the week
  status: TimesheetStatus;
  person_name: string;
  position_title: string;
  department: string;
  calc_mode: CalcMode;
  rate_type: RateType;
  weekly_rate_cents: number;
  daily_minimum_8h: boolean;
  per_diem_enabled: boolean;
  per_diem_full_day_cents: number;
  per_diem_partial_day_cents: number;
  custom_rules: CustomRulesOverride | null;
}

export interface TimesheetEntry {
  id: string;
  created_at: string;
  updated_at: string;
  timesheet_id: string;
  entry_date: string; // 'YYYY-MM-DD'
  work_start: string | null;  // 'HH:MM'
  work_end: string | null;    // 'HH:MM'
  break_minutes: number;
  travel_to_minutes: number;
  travel_back_minutes: number;
  travel_qualifies: boolean;
  place_of_work: string | null;
  bundesland: string | null; // DE-BY, DE-NW, etc.
  per_diem_type: PerDiemType;
  notes: string | null;
  /** Per-day override of the timesheet's daily_minimum_8h setting.
   *  null = inherit the timesheet-level default; true/false = force on/off for this day. */
  daily_minimum_override: boolean | null;
}

export interface ProjectTimesheetDefaults {
  project_id: string;
  created_at: string;
  updated_at: string;
  bundesland: string;
  rate_type: RateType;
  weekly_rate_cents: number;
  per_diem_enabled: boolean;
  total_shoot_days: number;
}

// ---------------------------------------------------------------------------
// Calculation engine types
// ---------------------------------------------------------------------------

/** Input to the calculation engine for a single day. */
export interface DayInput {
  date: string;        // 'YYYY-MM-DD'
  workStart: string | null;   // 'HH:MM' or null (day off)
  workEnd: string | null;     // 'HH:MM' or null
  breakMinutes: number;
  travelToMinutes: number;
  travelBackMinutes: number;
  travelQualifies: boolean;
  placeOfWork: string | null; // used to compare against homeBase for per-diem eligibility
  bundesland: string | null;
  perDiemType: PerDiemType;
  /** null = inherit ruleset.dailyMinimum8h; true/false = force on/off for this day. */
  dailyMinimumOverride: boolean | null;
}

/** Fully resolved ruleset passed to the calculation engine. */
export interface Ruleset {
  weeklyRateCents: number;
  rateType: RateType;
  dailyMinimum8h: boolean;

  // Daily OT thresholds (§ 5.4.3.2)
  dailyOtStartH: number;    // hours after which daily OT starts (default: 10)
  dailyOtBand1Pct: number;  // surcharge for hours 11 (default: 25)
  dailyOtBand2Pct: number;  // surcharge for hours 12+ (default: 50)

  // Weekly OT thresholds (§ 5.4.3.1/5.4.3.3 — separate from, and stacks with,
  // the Saturday/Sunday/holiday day-type surcharges: TZ 5.4.3.4 explicitly
  // treats 6th/7th-day work as weekly overtime *in addition to* TZ 5.6.4's
  // flat Saturday surcharge)
  weeklyOtEnabled: boolean;
  weeklyOtThresholdH: number; // hours after which weekly OT starts (default: 50)
  weeklyOtBand1EndH: number;  // hours where weekly band 1 ends (default: 55)
  weeklyOtBand1Pct: number;   // weekly OT band 1 surcharge (default: 25)
  weeklyOtBand2Pct: number;   // weekly OT band 2 surcharge (default: 50)

  // Night surcharge (§ 5.5) — 22:00–06:00
  nightEnabled: boolean;
  nightPct: number;

  // Day-type surcharges (§ 5.6 — stack with OT surcharges per C1 answer)
  saturdayEnabled: boolean;
  saturdayPct: number;
  sundayEnabled: boolean;
  sundayPct: number;
  holidayEnabled: boolean;
  holidayPct: number;

  // Per diem (§ 12.2)
  perDiemEnabled: boolean;
  perDiemFullDayCents: number;
  perDiemPartialDayCents: number;

  // Home base for per-diem eligibility: no per diem when placeOfWork matches homeBase
  homeBase: string;

  // Set of ISO date strings that are public holidays in the week being calculated
  publicHolidays: Set<string>;
}

/** Breakdown of a single day's pay components. */
export interface DayResult {
  date: string;
  isWorked: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  travelMinutes: number;       // travel mins counted (0 if !travelQualifies)
  rawWorkMinutes: number;      // work_end - work_start - break (no travel)
  totalWorkMinutes: number;    // rawWork + travelMinutes
  billedMinutes: number;       // max(totalWorkMinutes, 8h) when dailyMinimum8h; else totalWorkMinutes
  nightMinutes: number;        // minutes that fall in the 22:00-06:00 window
  dailyOtBand1Minutes: number; // minutes in daily OT band 1 (hour 11)
  dailyOtBand2Minutes: number; // minutes in daily OT band 2 (hour 12+)
  perDiemCents: number;
  // Per-day total pay (base + all day-level surcharges + per diem).
  // Computed in calculateWeek (requires hourlyCents). Zero when called via calculateDay standalone.
  dayTotalCents: number;
  // Minutes below the 11h minimum rest threshold vs. the next day (ArbZG § 5 / TV FFS § 5.8).
  // Non-zero only on the day that ended too late. Filled in by calculateWeek.
  restViolationMinutes: number;
  restViolationCents: number;
}

/** Aggregated weekly pay calculation result. */
export interface WeekResult {
  days: DayResult[];

  totalBilledMinutes: number;
  weeklyCountMinutes: number; // minutes that count toward weekly OT threshold
  weeklyOtBand1Minutes: number;
  weeklyOtBand2Minutes: number;

  // Pay breakdown (all in euro-cents)
  basePayCents: number;          // weekly rate (guaranteed) or actual hours at hourly rate
  dailyOtBand1Cents: number;
  dailyOtBand2Cents: number;
  weeklyOtBand1Cents: number;
  weeklyOtBand2Cents: number;
  nightSurchargeCents: number;
  saturdaySurchargeCents: number;
  sundaySurchargeCents: number;
  holidaySurchargeCents: number;
  perDiemCents: number;
  restViolationCents: number;    // ArbZG § 5 / TV FFS § 5.8 rest-period violation pay
  totalGrossCents: number;       // sum of all components

  hourlyRateCents: number;       // weeklyRate / 50 (standard) or / 40 (reduced)
}
