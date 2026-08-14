// Timesheet PDF template registry.
//
// A template bundles everything that is specific to one printed form: the
// source PDF, its coordinate transform, and the routine that paints dynamic
// values onto it. generate-pdf.ts stays generic — it loads the file, embeds
// fonts, scrubs metadata and calls render() — so adding a third form means
// adding a module here, never an `if (template === …)` in the generator.

import path from 'node:path';
import { degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { TIMESHEET_TEMPLATE_IDS } from '../types';
import type { Timesheet, TimesheetEntry, TimesheetTemplateId } from '../types';

export function isTimesheetTemplateId(value: unknown): value is TimesheetTemplateId {
  return typeof value === 'string' && (TIMESHEET_TEMPLATE_IDS as string[]).includes(value);
}

export interface TemplateFonts {
  regular: PDFFont;
  bold: PDFFont;
}

export interface TemplateRenderInput {
  timesheet: Timesheet;
  entries: TimesheetEntry[];
  projectName: string | null;
}

export interface TimesheetPdfTemplate {
  id: TimesheetTemplateId;
  /** Absolute path to the source PDF. */
  templatePath: string;
  /** Filename stem for the HTTP download. */
  fileStem: string;
  render(page: PDFPage, fonts: TemplateFonts, input: TemplateRenderInput): void;
}

export const TEXT_COLOR = rgb(0, 0, 0);

export function truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && font.widthOfTextAtSize(clipped + '…', size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

export interface DrawTextOptions {
  dxStart: number;
  dyBaseline: number;
  size: number;
  maxWidth?: number;
  font: PDFFont;
  /** Display-space → raw-space transform for the template's page. */
  toRaw: (p: { dx: number; dy: number }) => { x: number; y: number };
  /** Text rotation in degrees (90 for the /Rotate 90 default template). */
  rotation?: number;
}

/** Draws text so it reads correctly on the rendered page. */
export function drawDisplayText(page: PDFPage, text: string, opts: DrawTextOptions) {
  if (!text) return;
  const value = opts.maxWidth != null
    ? truncateToWidth(opts.font, text, opts.size, opts.maxWidth)
    : text;
  const { x, y } = opts.toRaw({ dx: opts.dxStart, dy: opts.dyBaseline });
  page.drawText(value, {
    x,
    y,
    size: opts.size,
    font: opts.font,
    color: TEXT_COLOR,
    rotate: degrees(opts.rotation ?? 0),
  });
}

export function templatePath(file: string): string {
  return path.join(process.cwd(), 'lib/timesheets/print', file);
}
