// Generates a printable Stundenzettel/Time Sheet PDF by importing the source
// template's page 1 unchanged and overlaying only dynamic values.
//
// Everything form-specific (geometry, which columns get filled, formatting)
// lives in the template modules registered below; this file only does the work
// that is identical for every form: load, embed fonts, scrub metadata, render,
// save.

import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFRef, StandardFonts } from 'pdf-lib';
import { defaultTemplate } from './template-default';
import { wbfilmTemplate } from './template-wbfilm';
import type { TimesheetPdfTemplate } from './templates';
import { DEFAULT_TIMESHEET_TEMPLATE } from '../types';
import type { Timesheet, TimesheetEntry, TimesheetTemplateId } from '../types';

const TEMPLATES: Record<TimesheetTemplateId, TimesheetPdfTemplate> = {
  default: defaultTemplate,
  wbfilm: wbfilmTemplate,
};

export function getTimesheetTemplate(id: TimesheetTemplateId | null | undefined): TimesheetPdfTemplate {
  return TEMPLATES[id ?? DEFAULT_TIMESHEET_TEMPLATE] ?? TEMPLATES[DEFAULT_TIMESHEET_TEMPLATE];
}

/**
 * Source templates carry their origin's document metadata (the default one's
 * Title is "MASQUE_Timesheet_Template.xlsx", plus an XMP stream duplicating
 * it) — none of it describes the file this app generates, and browsers surface
 * it (e.g. as the PDF tab/print title). Overwrite the Info dictionary and drop
 * the XMP stream entirely so only the app-supplied title survives.
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
  // bytes (which duplicate the origin's title/author) as an orphaned object
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
  /** Comes from the owning project; falls back to the original form. */
  template?: TimesheetTemplateId | null;
}

export async function generateTimesheetPdf({
  timesheet,
  entries,
  projectName,
  template,
}: GenerateTimesheetPdfInput): Promise<Uint8Array> {
  const form = getTimesheetTemplate(template);

  const templateBytes = await readFile(form.templatePath);
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPages()[0];

  const parsedCreatedAt = new Date(timesheet.created_at);
  const title = `Stundenzettel – ${timesheet.person_name || 'Timesheet'} – ${timesheet.week_start}`;
  scrubTemplateMetadata(doc, title, isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt);

  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  form.render(page, fonts, { timesheet, entries, projectName });

  return doc.save();
}
