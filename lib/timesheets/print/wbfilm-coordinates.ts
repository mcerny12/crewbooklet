// Geometry for the Wiedemann & Berg "WBFilmTSVorlage" Stundenzettel template.
//
// Unlike template.pdf (A4 portrait + /Rotate 90), this page is natively
// landscape 842×595 with rotation 0 — so there is NO axis swap: raw x is
// display x, and raw y is only flipped for PDF's bottom-left origin. Text is
// drawn unrotated.
//
// Every number below was read off the PDF's own vector rules with PyMuPDF
// (page.get_drawings()), not estimated visually. The column/row values ARE the
// table's printed grid lines, so cell centring is exact by construction.

/** Page height, for flipping display-space (y-down) to PDF space (y-up). */
export const WB_PAGE_HEIGHT = 595;
export const WB_PAGE_WIDTH = 842;

/** Convert a display-space point (top-left origin) to pdf-lib drawing space. */
export function wbToRawPoint({ dx, dy }: { dx: number; dy: number }): { x: number; y: number } {
  return { x: dx, y: WB_PAGE_HEIGHT - dy };
}

/** A table cell's horizontal extent, taken from the printed column rules. */
export interface WbColumn {
  x0: number;
  x1: number;
}

/**
 * Data columns, keyed by meaning. Boundaries are the template's vertical rules.
 * The 458.3–624.7 block ("Bereich für die FGF" — Mehrstunden / 25% / 50% /
 * Nacht 25%) is deliberately absent: it is the production accounting
 * department's boxed area and is never filled by this app, matching the
 * existing template's ACCOUNTING-USE-ONLY policy.
 */
export const WB_COLUMNS = {
  date: { x0: 77.5, x1: 123.1 },        // Datum
  workStart: { x0: 123.1, x1: 171.0 },  // Arbeitsbeginn Set
  workEnd: { x0: 171.0, x1: 225.0 },    // Arbeitsende Set
  break1: { x0: 225.0, x1: 269.8 },     // abzgl. PAUSE 1
  break2: { x0: 269.8, x1: 310.1 },     // abzgl. PAUSE 2 — no app data, left blank
  travelTo: { x0: 310.1, x1: 348.8 },   // zzgl. Hinfahrt
  travelBack: { x0: 348.8, x1: 387.6 }, // zzgl. Rückfahrt
  total: { x0: 387.6, x1: 458.3 },      // Zeit Gesamt
  notes: { x0: 669.6, x1: 798.0 },      // Bemerkungen / Notiz
} satisfies Record<string, WbColumn>;

/** Weekday row bands (display-space y), Monday first — the printed row rules. */
export const WB_ROW_BANDS: { top: number; bottom: number }[] = [
  { top: 255.4, bottom: 284.2 }, // Montag
  { top: 284.2, bottom: 313.1 }, // Dienstag
  { top: 313.1, bottom: 342.0 }, // Mittwoch
  { top: 342.0, bottom: 370.9 }, // Donnerstag
  { top: 370.9, bottom: 399.8 }, // Freitag
  { top: 399.8, bottom: 428.6 }, // Samstag
  { top: 428.6, bottom: 457.5 }, // Sonntag
];

/** Summary row beneath the weekdays (totals for the travel + Gesamt columns). */
export const WB_TOTALS_ROW = { top: 457.5, bottom: 478.0 };

/**
 * Header blanks. Each dyBaseline sits just above the printed rule so text
 * rests on the line the way a handwritten entry would.
 */
export const WB_HEADER_FIELDS = {
  production: { dxStart: 90.0, dyBaseline: 160.5, maxX: 224.0 },  // PRODUKTION: (rule y162)
  personName: { dxStart: 80.0, dyBaseline: 191.5, maxX: 224.0 },  // NAME: (rule y193)
  department: { dxStart: 627.0, dyBaseline: 191.5, maxX: 797.0 }, // ABTEILUNG: (rule y193)
  weekFrom: { dxStart: 160.0, dyBaseline: 213.5, maxX: 268.0 },   // "…Woche von:"
  weekTo: { dxStart: 290.0, dyBaseline: 213.5, maxX: 440.0 },     // "bis:"
};

export const WB_DATA_FONT_SIZE = 8;
export const WB_HEADER_FONT_SIZE = 9;

/** Horizontal padding for left-aligned cell text (only Bemerkungen). */
export const WB_CELL_PADDING = 3;
