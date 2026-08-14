// Wiedemann & Berg "WBFilmTSVorlage" Stundenzettel.
//
// Differences from the default form that drive this module:
//   * page is natively landscape, rotation 0 — no axis swap, no text rotation
//   * the letterhead is NOT overwritten; the form has its own PRODUKTION: field
//   * x 458.3–624.7 is the boxed "Bereich für die FGF" (Mehrstunden / 25% /
//     50% / Nacht 25%) — production accounting fills it by hand, we never do
//   * two break columns (PAUSE 1 / PAUSE 2) but the app stores one break total,
//     so the total goes in PAUSE 1 and PAUSE 2 stays empty
//   * "Teilnahme Setcatering" has no counterpart in the data model and keeps
//     its pre-printed empty checkbox
//
// Durations (Pause / Hinfahrt / Rückfahrt / Zeit Gesamt) are printed H:MM.
// The form itself gives no unit — unlike the default template, which labels
// those columns "(in min.)" — so this was a deliberate call: the form is
// Excel-derived and the cells sit in arithmetic with clock times. Confirmed
// as H:MM; change formatDuration below if that ever needs to become minutes.

import type { PDFPage } from 'pdf-lib';
import { addDays, format, parseISO } from 'date-fns';
import { calculateWeek } from '../calculation';
import { buildWeekInputs } from '../week-result';
import {
  WB_CELL_PADDING,
  WB_COLUMNS,
  WB_DATA_FONT_SIZE,
  WB_HEADER_FIELDS,
  WB_HEADER_FONT_SIZE,
  WB_ROW_BANDS,
  WB_TOTALS_ROW,
  wbToRawPoint,
  type WbColumn,
} from './wbfilm-coordinates';
import {
  drawDisplayText,
  templatePath,
  type TemplateFonts,
  type TemplateRenderInput,
  type TimesheetPdfTemplate,
} from './templates';

/** Durations as H:MM (90 → "1:30"). Blank for zero/absent. */
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatClock(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function render(page: PDFPage, fonts: TemplateFonts, { timesheet, entries, projectName }: TemplateRenderInput) {
  const drawAt = (text: string, dxStart: number, dyBaseline: number, size: number, maxWidth?: number, bold = false) =>
    drawDisplayText(page, text, {
      dxStart,
      dyBaseline,
      size,
      maxWidth,
      font: bold ? fonts.bold : fonts.regular,
      toRaw: wbToRawPoint,
    });

  /** Centres text inside a printed column — exact, since the bounds are the rules. */
  const drawCentered = (text: string, col: WbColumn, dyBaseline: number, bold = false) => {
    if (!text) return;
    const font = bold ? fonts.bold : fonts.regular;
    const width = font.widthOfTextAtSize(text, WB_DATA_FONT_SIZE);
    const dxStart = (col.x0 + col.x1) / 2 - width / 2;
    drawAt(text, dxStart, dyBaseline, WB_DATA_FONT_SIZE, undefined, bold);
  };

  // ── Header ──────────────────────────────────────────────────────────────
  const monday = parseISO(timesheet.week_start);
  const sunday = addDays(monday, 6);

  drawAt(projectName ?? '', WB_HEADER_FIELDS.production.dxStart, WB_HEADER_FIELDS.production.dyBaseline,
    WB_HEADER_FONT_SIZE, WB_HEADER_FIELDS.production.maxX - WB_HEADER_FIELDS.production.dxStart, true);
  drawAt(timesheet.person_name ?? '', WB_HEADER_FIELDS.personName.dxStart, WB_HEADER_FIELDS.personName.dyBaseline,
    WB_HEADER_FONT_SIZE, WB_HEADER_FIELDS.personName.maxX - WB_HEADER_FIELDS.personName.dxStart);
  drawAt(timesheet.department ?? '', WB_HEADER_FIELDS.department.dxStart, WB_HEADER_FIELDS.department.dyBaseline,
    WB_HEADER_FONT_SIZE, WB_HEADER_FIELDS.department.maxX - WB_HEADER_FIELDS.department.dxStart);
  drawAt(format(monday, 'dd.MM.yyyy'), WB_HEADER_FIELDS.weekFrom.dxStart, WB_HEADER_FIELDS.weekFrom.dyBaseline,
    WB_DATA_FONT_SIZE, WB_HEADER_FIELDS.weekFrom.maxX - WB_HEADER_FIELDS.weekFrom.dxStart);
  drawAt(format(sunday, 'dd.MM.yyyy'), WB_HEADER_FIELDS.weekTo.dxStart, WB_HEADER_FIELDS.weekTo.dyBaseline,
    WB_DATA_FONT_SIZE, WB_HEADER_FIELDS.weekTo.maxX - WB_HEADER_FIELDS.weekTo.dxStart);

  // "Zeit Gesamt" is (Arbeitsende − Arbeitsbeginn) − Pausen + Fahrten, which is
  // exactly the engine's totalWorkMinutes — reuse it rather than re-deriving
  // the formula (it also handles overnight shifts and non-qualifying travel).
  const { days, ruleset } = buildWeekInputs(timesheet, entries);
  const week = calculateWeek(days, ruleset);

  // ── Weekday rows ────────────────────────────────────────────────────────
  let totalTravelTo = 0;
  let totalTravelBack = 0;
  let totalWorked = 0;

  for (let i = 0; i < 7; i++) {
    const date = format(addDays(monday, i), 'yyyy-MM-dd');
    const entry = entries.find((e) => e.entry_date === date);
    const row = WB_ROW_BANDS[i];
    const baseline = (row.top + row.bottom) / 2 + 3;

    drawCentered(format(addDays(monday, i), 'dd.MM.'), WB_COLUMNS.date, baseline);

    if (!entry) continue;

    drawCentered(formatClock(entry.work_start), WB_COLUMNS.workStart, baseline);
    drawCentered(formatClock(entry.work_end), WB_COLUMNS.workEnd, baseline);
    drawCentered(formatDuration(entry.break_minutes), WB_COLUMNS.break1, baseline);

    if (entry.travel_qualifies) {
      drawCentered(formatDuration(entry.travel_to_minutes), WB_COLUMNS.travelTo, baseline);
      drawCentered(formatDuration(entry.travel_back_minutes), WB_COLUMNS.travelBack, baseline);
      totalTravelTo += entry.travel_to_minutes;
      totalTravelBack += entry.travel_back_minutes;
    }

    const worked = week.days[i]?.totalWorkMinutes ?? 0;
    drawCentered(formatDuration(worked), WB_COLUMNS.total, baseline);
    totalWorked += worked;

    drawAt(entry.notes ?? '', WB_COLUMNS.notes.x0 + WB_CELL_PADDING, baseline, WB_DATA_FONT_SIZE,
      WB_COLUMNS.notes.x1 - WB_COLUMNS.notes.x0 - WB_CELL_PADDING * 2);
  }

  // ── Totals row ──────────────────────────────────────────────────────────
  const totalsBaseline = (WB_TOTALS_ROW.top + WB_TOTALS_ROW.bottom) / 2 + 3;
  drawCentered(formatDuration(totalTravelTo), WB_COLUMNS.travelTo, totalsBaseline, true);
  drawCentered(formatDuration(totalTravelBack), WB_COLUMNS.travelBack, totalsBaseline, true);
  drawCentered(formatDuration(totalWorked), WB_COLUMNS.total, totalsBaseline, true);
}

export const wbfilmTemplate: TimesheetPdfTemplate = {
  id: 'wbfilm',
  templatePath: templatePath('wbfilm-template.pdf'),
  fileStem: 'wb-stundenzettel',
  render,
};
