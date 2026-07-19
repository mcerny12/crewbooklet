// Geometry for overlaying dynamic values onto the original Stundenzettel/Time
// Sheet PDF template (template.pdf — A4, /Rotate 90, landscape display).
//
// All coordinates below are in "display space": the page as a human reads
// it — origin top-left, x increasing rightward, y increasing downward, units
// in PDF points, bounds roughly 0..842 (width) by 0..595.22 (height). This
// matches the rotated /Rotate 90 rendering and was measured directly off the
// template with PyMuPDF (word/line bounding boxes), not estimated visually.
//
// pdf-lib draws in the page's raw (pre-rotation) content-stream space, which
// is NOT the same as display space. `toRawPoint` below converts one to the
// other; it was derived and verified empirically (see generate-pdf.ts) — for
// this specific page (square swap, /Rotate 90) the transform is a straight
// coordinate swap: rawX = displayY, rawY = displayX. Do not reuse this
// formula for a differently-rotated page without re-deriving it.

/** A point in display space (top-left origin, y-down). */
export interface DisplayPoint {
  dx: number;
  dy: number;
}

/** Convert a display-space point to the page's raw pdf-lib drawing space. */
export function toRawPoint({ dx, dy }: DisplayPoint): { x: number; y: number } {
  return { x: dy, y: dx };
}

/**
 * Convert a display-space axis-aligned box to a raw-space rectangle
 * (x, y = bottom-left corner in raw space, plus width/height) suitable for
 * page.drawRectangle(). Display width becomes raw height and vice versa,
 * since the page is rotated 90°.
 */
export function toRawRect(dx0: number, dy0: number, dx1: number, dy1: number) {
  return {
    x: Math.min(dy0, dy1),
    y: Math.min(dx0, dx1),
    width: Math.abs(dy1 - dy0),
    height: Math.abs(dx1 - dx0),
  };
}

/** Row band (display-space y top/bottom) for each weekday, Monday first. */
export const WEEKDAY_ROWS: { top: number; bottom: number }[] = [
  { top: 255.1, bottom: 283.1 }, // Montag
  { top: 283.8, bottom: 312.1 }, // Dienstag
  { top: 312.8, bottom: 341.2 }, // Mittwoch
  { top: 341.9, bottom: 370.2 }, // Donnerstag
  { top: 370.9, bottom: 399.2 }, // Freitag
  { top: 400.0, bottom: 428.3 }, // Samstag
  { top: 429.0, bottom: 457.0 }, // Sonntag
];

/** Left edge (display-space x, with left padding already applied) for each data column in a weekday row. */
export const ROW_COLUMNS = {
  date: 87.5,        // col 2 — Datum
  travelTo: 154.0,    // col 3 — Hinfahrt (in min.)
  workStart: 193.0,   // col 4 — von / in
  workEnd: 267.0,      // col 5 — bis / out
  breakMinutes: 340.0, // col 6 — Pause (in min.)
  travelBack: 391.0,   // col 7 — Rückfahrt (in min.)
  placeOfWork: 430.0,  // col 8 — Einsatzort
};

/** Right boundary (display-space x) of the Einsatzort column, for text clipping. */
export const PLACE_OF_WORK_MAX_X = 563.0;

/** Header field blank-line baselines (display space) and the line's right extent. */
export const HEADER_FIELDS = {
  personName: { dxStart: 110.0, dyBaseline: 107.0, maxX: 333.0 },
  positionTitle: { dxStart: 110.0, dyBaseline: 136.3, maxX: 333.0 },
  department: { dxStart: 110.0, dyBaseline: 165.3, maxX: 333.0 },
};

/**
 * The template's static "RAGE" brand line (top-left, above "STUNDENZETTEL")
 * is replaced with the linked project's name — the one static element this
 * overlay is allowed to cover, per explicit product decision (CrewBooklet
 * timesheets span many productions, not one fixed client letterhead).
 */
export const PROJECT_NAME_AREA = {
  whiteoutBox: { dx0: 20.0, dy0: 23.0, dx1: 410.0, dy1: 43.5 },
  dxStart: 24.0,
  dyBaseline: 39.5,
  maxX: 405.0,
  fontSize: 15,
};
