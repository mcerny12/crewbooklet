// Structural sanity checks for the template-import + overlay PDF generator.
// The actual pixel-fidelity claim (blank generated PDF == template.pdf,
// verified via Pillow diff at 300dpi) was checked manually — see repo
// history — since a poppler/ImageMagick pixel-diff pipeline is out of scope
// for this project's Node/vitest test suite.

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateTimesheetPdf } from './generate-pdf';
import { resolveTimesheetTemplate } from '../types';
import type { Timesheet, TimesheetEntry } from '../types';

const BASE_TIMESHEET: Timesheet = {
  id: 'ts-1',
  created_at: '',
  updated_at: '',
  user_id: '',
  project_id: null,
  week_start: '2026-07-06', // Monday
  status: 'draft',
  person_name: 'Jane Doe',
  position_title: 'Gaffer',
  department: 'Lighting',
  calc_mode: 'full_tarif',
  rate_type: 'standard',
  weekly_rate_cents: 200000,
  daily_minimum_8h: true,
  per_diem_enabled: false,
  per_diem_full_day_cents: 0,
  per_diem_partial_day_cents: 0,
  custom_rules: null,
};

function entry(overrides: Partial<TimesheetEntry> = {}): TimesheetEntry {
  return {
    id: '', created_at: '', updated_at: '',
    timesheet_id: BASE_TIMESHEET.id,
    entry_date: '2026-07-06',
    work_start: '08:00',
    work_end: '18:00',
    break_minutes: 30,
    travel_to_minutes: 0,
    travel_back_minutes: 0,
    travel_qualifies: false,
    place_of_work: null,
    bundesland: null,
    per_diem_type: 'none',
    notes: null,
    daily_minimum_override: null,
    ...overrides,
  };
}

describe('generateTimesheetPdf', () => {
  it('produces a single-page A4 landscape (rotated) PDF matching the template', async () => {
    const bytes = await generateTimesheetPdf({ timesheet: BASE_TIMESHEET, entries: [], projectName: null });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPages()[0];
    const { width, height } = page.getSize();
    expect(width).toBeCloseTo(595.22, 1);
    expect(height).toBe(842);
    expect(page.getRotation().angle).toBe(90);
  });

  it('does not throw for a blank timesheet with no entries', async () => {
    const bytes = await generateTimesheetPdf({ timesheet: BASE_TIMESHEET, entries: [], projectName: null });
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('does not throw for a fully populated week, including an overnight shift and long place-of-work text', async () => {
    const entries: TimesheetEntry[] = [
      entry({ entry_date: '2026-07-06', work_start: '22:00', work_end: '06:00' }), // overnight
      entry({ entry_date: '2026-07-07', travel_qualifies: true, travel_to_minutes: 45, travel_back_minutes: 45 }),
      entry({
        entry_date: '2026-07-08',
        place_of_work: 'A very long location name that should be clipped rather than overflow the Einsatzort column',
      }),
    ];
    const bytes = await generateTimesheetPdf({
      timesheet: BASE_TIMESHEET,
      entries,
      projectName: 'A Project With A Fairly Long Working Title',
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('handles a partially completed row (some fields set, others null) without throwing', async () => {
    const entries: TimesheetEntry[] = [
      entry({ entry_date: '2026-07-06', work_start: null, work_end: null, place_of_work: 'Berlin' }),
    ];
    const bytes = await generateTimesheetPdf({ timesheet: BASE_TIMESHEET, entries, projectName: null });
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('falls back to the default template for an unset or unknown project setting', async () => {
    for (const template of [undefined, null] as const) {
      const bytes = await generateTimesheetPdf({
        timesheet: BASE_TIMESHEET, entries: [], projectName: null, template,
      });
      const page = (await PDFDocument.load(bytes)).getPages()[0];
      // The default form is the /Rotate 90 portrait one; wbfilm is landscape.
      expect(page.getRotation().angle).toBe(90);
    }
  });
});

describe('generateTimesheetPdf — wbfilm template', () => {
  const wb = { template: 'wbfilm' as const };

  it('produces a single-page native-landscape PDF with no rotation', async () => {
    const bytes = await generateTimesheetPdf({
      timesheet: BASE_TIMESHEET, entries: [], projectName: null, ...wb,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPages()[0];
    const { width, height } = page.getSize();
    expect(width).toBe(842);
    expect(height).toBe(595);
    expect(page.getRotation().angle).toBe(0);
  });

  it('renders a full week including overnight, qualifying travel and notes', async () => {
    const entries: TimesheetEntry[] = [
      entry({ entry_date: '2026-07-06', work_start: '07:30', work_end: '19:15', break_minutes: 45 }),
      entry({ entry_date: '2026-07-07', travel_qualifies: true, travel_to_minutes: 45, travel_back_minutes: 60, notes: 'Drehtag Studio' }),
      entry({ entry_date: '2026-07-08', work_start: '22:00', work_end: '06:00' }), // overnight
    ];
    const bytes = await generateTimesheetPdf({
      timesheet: BASE_TIMESHEET, entries, projectName: 'A Long Production Title That Should Clip', ...wb,
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it('is selected by resolveTimesheetTemplate when the client organization sets it', async () => {
    // The org default drives the export; the project stays on null (inherit).
    const template = resolveTimesheetTemplate(null, 'wbfilm');
    const bytes = await generateTimesheetPdf({
      timesheet: BASE_TIMESHEET, entries: [], projectName: 'W&B Production', template,
    });
    expect((await PDFDocument.load(bytes)).getPages()[0].getRotation().angle).toBe(0);
  });

  it('works when the weekly rate is zero (Zeit Gesamt is rate-independent)', async () => {
    // computeTimesheetWeekResult bails out at rate 0; the PDF must not, since
    // worked minutes don't depend on pay. Guards the buildWeekInputs split.
    const bytes = await generateTimesheetPdf({
      timesheet: { ...BASE_TIMESHEET, weekly_rate_cents: 0 },
      entries: [entry({ entry_date: '2026-07-06' })],
      projectName: null,
      ...wb,
    });
    expect(bytes.length).toBeGreaterThan(0);
  });
});
