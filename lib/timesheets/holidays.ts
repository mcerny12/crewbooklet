// German public holiday calculator.
//
// Returns ISO date strings ('YYYY-MM-DD') for a given year and Bundesland.
// We only compute the dates needed for the timesheets module.
//
// Sources:
//   - Einheitlichkeit gesetzlicher Feiertage (federal)
//   - State-specific additions per German law
//   - TV FFS § 5.6.1: "gesetzliche Feiertage am Arbeitsort"
//
// Bundesland codes follow DE-<ISO3166-2>:
//   BE Berlin, BB Brandenburg, BW Baden-Württemberg, BY Bavaria,
//   HB Bremen, HE Hesse, HH Hamburg, MV Mecklenburg-Vorpommern,
//   NI Lower Saxony, NW North Rhine-Westphalia, RP Rhineland-Palatinate,
//   SH Schleswig-Holstein, SL Saarland, SN Saxony, ST Saxony-Anhalt, TH Thuringia

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Compute Easter Sunday using the anonymous Gregorian algorithm. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date): string {
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Returns all national + state-specific public holidays for a given year and Bundesland. */
export function getPublicHolidays(year: number, bundesland: string): Set<string> {
  const state = bundesland.replace('DE-', '').toUpperCase();
  const easter = easterSunday(year);

  const holidays = new Set<string>();

  // ── Federal holidays (all 16 states) ──────────────────────────────────────
  holidays.add(isoDate(year, 1, 1));   // Neujahr
  holidays.add(fmt(addDays(easter, -2))); // Karfreitag
  holidays.add(fmt(easter));              // Ostersonntag (federal)
  holidays.add(fmt(addDays(easter, 1)));  // Ostermontag
  holidays.add(isoDate(year, 5, 1));   // Tag der Arbeit
  holidays.add(fmt(addDays(easter, 39))); // Christi Himmelfahrt
  holidays.add(fmt(addDays(easter, 49))); // Pfingstsonntag (federal)
  holidays.add(fmt(addDays(easter, 50))); // Pfingstmontag
  holidays.add(isoDate(year, 10, 3)); // Tag der Deutschen Einheit
  holidays.add(isoDate(year, 12, 25)); // 1. Weihnachtstag
  holidays.add(isoDate(year, 12, 26)); // 2. Weihnachtstag

  // ── State-specific holidays ──────────────────────────────────────────────

  // Heilige Drei Könige: BW, BY, ST
  if (['BW', 'BY', 'ST'].includes(state)) {
    holidays.add(isoDate(year, 1, 6));
  }

  // Frauentag: BE, MV (since 2019)
  if (['BE', 'MV'].includes(state)) {
    holidays.add(isoDate(year, 3, 8));
  }

  // Gründonnerstag (Tag der Arbeit Rheinland-Pfalz only — historically RP had it but it's no longer active)
  // no-op

  // Fronleichnam (60 days after Easter): BW, BY, HE, NW, RP, SL
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(state)) {
    holidays.add(fmt(addDays(easter, 60)));
  }

  // Mariä Himmelfahrt: BY (catholic communities), SL
  if (['BY', 'SL'].includes(state)) {
    holidays.add(isoDate(year, 8, 15));
  }

  // Weltkindertag: TH
  if (state === 'TH') {
    holidays.add(isoDate(year, 9, 20));
  }

  // Reformationstag: BB, HB, HH, MV, NI, SH, SN, ST, TH
  if (['BB', 'HB', 'HH', 'MV', 'NI', 'SH', 'SN', 'ST', 'TH'].includes(state)) {
    holidays.add(isoDate(year, 10, 31));
  }

  // Allerheiligen: BW, BY, NW, RP, SL
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(state)) {
    holidays.add(isoDate(year, 11, 1));
  }

  // Buß- und Bettag: SN (Wednesday before Nov 23)
  if (state === 'SN') {
    const nov23 = new Date(year, 10, 23);
    const dow = nov23.getDay(); // 0=Sun … 6=Sat
    const offset = dow === 3 ? 0 : dow < 3 ? -(dow + 4) : 7 - dow + 3;
    holidays.add(fmt(addDays(nov23, offset)));
  }

  // Heiligabend / Silvester are NOT public holidays in Germany (working days).

  return holidays;
}

/** Returns public holidays for the 7 days in a given Monday-starting week. */
export function getWeekHolidays(weekStart: string, bundesland: string): Set<string> {
  const [y, m, d] = weekStart.split('-').map(Number);
  const monday = new Date(y, m - 1, d);
  const year = monday.getFullYear();

  // Collect from both years in case the week straddles Dec 31 / Jan 1
  const all = new Set([
    ...getPublicHolidays(year, bundesland),
    ...getPublicHolidays(year + 1, bundesland),
  ]);

  const weekDates = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const date = fmt(addDays(monday, i));
    if (all.has(date)) weekDates.add(date);
  }
  return weekDates;
}
