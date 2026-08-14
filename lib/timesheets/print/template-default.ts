// The original Stundenzettel/Time Sheet form (template.pdf).
//
// Columns 9–11 (Std. gesamt / Überstunden / Überstunden-Nachtzuschläge), the
// CODING/EURO accounting box, the GESAMT total-payable-hours row and the
// signature footer are intentionally left blank: they're boxed "ACCOUNTING USE
// ONLY" / hand-signed on the original form, and this app never prints pay
// figures (see calculation.ts).

import { rgb, type PDFPage } from 'pdf-lib';
import { addDays, format, parseISO } from 'date-fns';
import {
  HEADER_FIELDS,
  PLACE_OF_WORK_MAX_X,
  PROJECT_NAME_AREA,
  ROW_COLUMNS,
  WEEKDAY_ROWS,
  toRawPoint,
  toRawRect,
} from './coordinates';
import {
  drawDisplayText,
  templatePath,
  type TemplateFonts,
  type TemplateRenderInput,
  type TimesheetPdfTemplate,
} from './templates';

const DATA_FONT_SIZE = 8;

function formatHHMM(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function minutesLabel(m: number | null | undefined): string {
  return m ? String(m) : '';
}

function render(page: PDFPage, fonts: TemplateFonts, { timesheet, entries, projectName }: TemplateRenderInput) {
  const draw = (text: string, o: { dxStart: number; dyBaseline: number; size: number; maxWidth?: number; bold?: boolean }) =>
    drawDisplayText(page, text, {
      dxStart: o.dxStart,
      dyBaseline: o.dyBaseline,
      size: o.size,
      maxWidth: o.maxWidth,
      font: o.bold ? fonts.bold : fonts.regular,
      toRaw: toRawPoint,
      rotation: 90,
    });

  // Project name replaces the template's fixed "RAGE" brand line — the one
  // static element this overlay is allowed to cover (explicit product
  // decision: timesheets span many productions, not one fixed letterhead).
  if (projectName) {
    const box = PROJECT_NAME_AREA.whiteoutBox;
    const rect = toRawRect(box.dx0, box.dy0, box.dx1, box.dy1);
    page.drawRectangle({ ...rect, color: rgb(1, 1, 1) });
    draw(projectName, {
      dxStart: PROJECT_NAME_AREA.dxStart,
      dyBaseline: PROJECT_NAME_AREA.dyBaseline,
      size: PROJECT_NAME_AREA.fontSize,
      maxWidth: PROJECT_NAME_AREA.maxX - PROJECT_NAME_AREA.dxStart,
      bold: true,
    });
  }

  draw(timesheet.person_name ?? '', {
    dxStart: HEADER_FIELDS.personName.dxStart,
    dyBaseline: HEADER_FIELDS.personName.dyBaseline,
    size: 9,
    maxWidth: HEADER_FIELDS.personName.maxX - HEADER_FIELDS.personName.dxStart,
  });
  draw(timesheet.position_title ?? '', {
    dxStart: HEADER_FIELDS.positionTitle.dxStart,
    dyBaseline: HEADER_FIELDS.positionTitle.dyBaseline,
    size: 9,
    maxWidth: HEADER_FIELDS.positionTitle.maxX - HEADER_FIELDS.positionTitle.dxStart,
  });
  draw(timesheet.department ?? '', {
    dxStart: HEADER_FIELDS.department.dxStart,
    dyBaseline: HEADER_FIELDS.department.dyBaseline,
    size: 9,
    maxWidth: HEADER_FIELDS.department.maxX - HEADER_FIELDS.department.dxStart,
  });

  const monday = parseISO(timesheet.week_start);
  for (let i = 0; i < 7; i++) {
    const date = format(addDays(monday, i), 'yyyy-MM-dd');
    const entry = entries.find((e) => e.entry_date === date);
    const row = WEEKDAY_ROWS[i];
    const baseline = (row.top + row.bottom) / 2 + 3;

    draw(format(addDays(monday, i), 'dd.MM.'), {
      dxStart: ROW_COLUMNS.date,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
    });

    if (!entry) continue;

    if (entry.travel_qualifies) {
      draw(minutesLabel(entry.travel_to_minutes), {
        dxStart: ROW_COLUMNS.travelTo, dyBaseline: baseline, size: DATA_FONT_SIZE,
      });
      draw(minutesLabel(entry.travel_back_minutes), {
        dxStart: ROW_COLUMNS.travelBack, dyBaseline: baseline, size: DATA_FONT_SIZE,
      });
    }
    draw(formatHHMM(entry.work_start), {
      dxStart: ROW_COLUMNS.workStart, dyBaseline: baseline, size: DATA_FONT_SIZE,
    });
    draw(formatHHMM(entry.work_end), {
      dxStart: ROW_COLUMNS.workEnd, dyBaseline: baseline, size: DATA_FONT_SIZE,
    });
    draw(minutesLabel(entry.break_minutes), {
      dxStart: ROW_COLUMNS.breakMinutes, dyBaseline: baseline, size: DATA_FONT_SIZE,
    });
    draw(entry.place_of_work ?? '', {
      dxStart: ROW_COLUMNS.placeOfWork,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
      maxWidth: PLACE_OF_WORK_MAX_X - ROW_COLUMNS.placeOfWork,
    });
  }
}

export const defaultTemplate: TimesheetPdfTemplate = {
  id: 'default',
  templatePath: templatePath('template.pdf'),
  fileStem: 'stundenzettel',
  render,
};
