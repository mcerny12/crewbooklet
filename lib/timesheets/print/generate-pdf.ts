// Generates the printable Stundenzettel/Time Sheet PDF by importing the
// original template's page 1 unchanged and overlaying only dynamic values —
// see coordinates.ts for why/how. Columns 9–11 (Std. gesamt / Überstunden /
// Überstunden-Nachtzuschläge), the CODING/EURO accounting box, the GESAMT
// total-payable-hours row, and the signature footer are intentionally left
// blank: they're boxed "ACCOUNTING USE ONLY" / hand-signed on the original
// form, and this app never prints pay figures (see calculation.ts).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, PDFName, PDFRef, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
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
import type { Timesheet, TimesheetEntry } from '../types';

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/timesheets/print/template.pdf');

const DATA_FONT_SIZE = 8;
const TEXT_COLOR = rgb(0, 0, 0);

function truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && font.widthOfTextAtSize(clipped + '…', size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

/** Draws text so it reads correctly on the rendered (rotated) page. */
function drawDisplayText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  opts: { dxStart: number; dyBaseline: number; size: number; maxWidth?: number; color?: ReturnType<typeof rgb> }
) {
  if (!text) return;
  const size = opts.size;
  const value = opts.maxWidth != null ? truncateToWidth(font, text, size, opts.maxWidth) : text;
  const { x, y } = toRawPoint({ dx: opts.dxStart, dy: opts.dyBaseline });
  page.drawText(value, {
    x,
    y,
    size,
    font,
    color: opts.color ?? TEXT_COLOR,
    rotate: degrees(90),
  });
}

function formatHHMM(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function minutesLabel(m: number | null | undefined): string {
  return m ? String(m) : '';
}

/**
 * template.pdf carries the original vendor's document metadata (Title:
 * "MASQUE_Timesheet_Template.xlsx", Author, Creator, an XMP stream
 * duplicating all of it, etc.) — none of it describes the file this app
 * actually generates, and browsers surface it (e.g. as the PDF tab/print
 * title). Overwrite the Info dictionary and drop the XMP stream entirely so
 * only the app-supplied title survives.
 */
function scrubTemplateMetadata(doc: PDFDocument, title: string, createdAt: Date) {
  doc.setTitle(title);
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setCreator('CrewBooklet');
  doc.setProducer('CrewBooklet');
  doc.setCreationDate(createdAt);
  doc.setModificationDate(new Date());

  // Removing just the catalog's /Metadata key leaves the old XMP stream's
  // bytes (which duplicate the vendor's title/author) as an orphaned object
  // that pdf-lib still serializes into the output. Delete it from the
  // context too so it's dropped from the file entirely, not merely
  // unreferenced.
  const metaRef = doc.catalog.get(PDFName.of('Metadata'));
  doc.catalog.delete(PDFName.of('Metadata'));
  if (metaRef instanceof PDFRef) doc.context.delete(metaRef);
}

export interface GenerateTimesheetPdfInput {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
  projectName: string | null;
}

export async function generateTimesheetPdf({
  timesheet,
  entries,
  projectName,
}: GenerateTimesheetPdfInput): Promise<Uint8Array> {
  const templateBytes = await readFile(TEMPLATE_PATH);
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPages()[0];

  const parsedCreatedAt = new Date(timesheet.created_at);
  const title = `Stundenzettel – ${timesheet.person_name || 'Timesheet'} – ${timesheet.week_start}`;
  scrubTemplateMetadata(doc, title, isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt);

  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Project name replaces the template's fixed "RAGE" brand line — the one
  // static element this overlay is allowed to cover (explicit product
  // decision: timesheets span many productions, not one fixed letterhead).
  if (projectName) {
    const box = PROJECT_NAME_AREA.whiteoutBox;
    const rect = toRawRect(box.dx0, box.dy0, box.dx1, box.dy1);
    page.drawRectangle({ ...rect, color: rgb(1, 1, 1) });
    drawDisplayText(page, boldFont, projectName, {
      dxStart: PROJECT_NAME_AREA.dxStart,
      dyBaseline: PROJECT_NAME_AREA.dyBaseline,
      size: PROJECT_NAME_AREA.fontSize,
      maxWidth: PROJECT_NAME_AREA.maxX - PROJECT_NAME_AREA.dxStart,
    });
  }

  drawDisplayText(page, regularFont, timesheet.person_name ?? '', {
    dxStart: HEADER_FIELDS.personName.dxStart,
    dyBaseline: HEADER_FIELDS.personName.dyBaseline,
    size: 9,
    maxWidth: HEADER_FIELDS.personName.maxX - HEADER_FIELDS.personName.dxStart,
  });
  drawDisplayText(page, regularFont, timesheet.position_title ?? '', {
    dxStart: HEADER_FIELDS.positionTitle.dxStart,
    dyBaseline: HEADER_FIELDS.positionTitle.dyBaseline,
    size: 9,
    maxWidth: HEADER_FIELDS.positionTitle.maxX - HEADER_FIELDS.positionTitle.dxStart,
  });
  drawDisplayText(page, regularFont, timesheet.department ?? '', {
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

    drawDisplayText(page, regularFont, format(addDays(monday, i), 'dd.MM.'), {
      dxStart: ROW_COLUMNS.date,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
    });

    if (!entry) continue;

    if (entry.travel_qualifies) {
      drawDisplayText(page, regularFont, minutesLabel(entry.travel_to_minutes), {
        dxStart: ROW_COLUMNS.travelTo,
        dyBaseline: baseline,
        size: DATA_FONT_SIZE,
      });
      drawDisplayText(page, regularFont, minutesLabel(entry.travel_back_minutes), {
        dxStart: ROW_COLUMNS.travelBack,
        dyBaseline: baseline,
        size: DATA_FONT_SIZE,
      });
    }
    drawDisplayText(page, regularFont, formatHHMM(entry.work_start), {
      dxStart: ROW_COLUMNS.workStart,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
    });
    drawDisplayText(page, regularFont, formatHHMM(entry.work_end), {
      dxStart: ROW_COLUMNS.workEnd,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
    });
    drawDisplayText(page, regularFont, minutesLabel(entry.break_minutes), {
      dxStart: ROW_COLUMNS.breakMinutes,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
    });
    drawDisplayText(page, regularFont, entry.place_of_work ?? '', {
      dxStart: ROW_COLUMNS.placeOfWork,
      dyBaseline: baseline,
      size: DATA_FONT_SIZE,
      maxWidth: PLACE_OF_WORK_MAX_X - ROW_COLUMNS.placeOfWork,
    });
  }

  return doc.save();
}
