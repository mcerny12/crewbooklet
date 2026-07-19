# Audit Run Log

Incremental audit reports (see `.audit/state.json` for machine state). This
file is distinct from `AUDIT.md`, which is a read-only operating manual —
each run here only ever *appends*, never touches `AUDIT.md`.

---

## Run 1 — 2026-07-19 (full baseline)

Branch: `audit/full-baseline`. Mode: full (no prior `.audit/state.json` existed).
173 tracked source/config files hashed into the new baseline.

### Fixed this run

- **FIXED-01** (critical, commit `3886069`): `TimesheetEstimatePanel`
  (`components/timesheets/timesheet-estimate-panel.tsx`) hardcoded every UI
  string in German instead of calling `useTranslations`, unlike every sibling
  timesheets component. This left `en.json` missing 15 keys that were added
  alongside `de.json` in `07c37a8` ("detailed per-day pay breakdown"),
  which broke `tsc --noEmit` / `next build` on `main` (message-shape mismatch
  in the invoice print page's locale map), and meant English-locale users saw
  German text in the confidential pay-estimate panel. Wired the component to
  `next-intl` and added the missing English translations (plus a new
  `perDiemLine` key for one label that had no existing slot).
- **LINT-01** (commit `65207b7`): removed 9 stale/unused `eslint-disable`
  directives via `npm run lint -- --fix`. No behavior change.

### Baseline (after fixes)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors, 91 warnings (pre-existing) |
| `npm run build` | ✅ pass |
| `npm run test` | ✅ 85/85 (`lib/timesheets/calculation.test.ts`) |

### Security invariant check

Confirmed the pay-estimate confidentiality invariant holds: `timesheets_select`
RLS policy (`supabase/migrations/20260717120000_timesheets.sql:190`) restricts
reads to `user_id = auth.uid() or auth_is_admin()`, and
`app/timesheets/[id]/print/page.tsx` never imports `TimesheetEstimatePanel`.

### Open findings (awaiting approval — nothing deleted yet)

**Dead files** (proof-of-unused verified via grep, zero import sites):

| ID | File | Note |
|---|---|---|
| DEAD-01 | `components/i18n/language-switcher.tsx` | Orphaned — switcher moved into `components/settings/general-section.tsx`; `sidebar.tsx` has a comment confirming the move. CLAUDE.md still documents it as living in the sidebar. |
| DEAD-02 | `components/mobile/index.ts` | Barrel with zero consumers; all mobile-detail files import individual files directly. |
| DEAD-03/04/05 | `person-list-item.tsx` / `organization-list-item.tsx` / `project-list-item.tsx` | Superseded by `compact-*-list-item.tsx` variants. |
| DEAD-06 | `components/projects/project-detail-drawer.tsx` | Only consumer was DEAD-05, also dead. |
| DEAD-07/08/09 | `person-detail-dialog.tsx` / `organization-detail-dialog.tsx` / `project-detail-dialog.tsx` | Legacy dialog-based detail views, superseded by the panel/drawer pattern. |
| DEAD-10/11/12 | `date-picker.tsx` / `table.tsx` / `separator.tsx` | Unused shadcn scaffold primitives. |
| DEAD-13 | `lib/types/models.ts` | 17 exports with zero usages (Display/Colors/Icons dictionaries + getters). CLAUDE.md calls this file an intentional fallback — ambiguous, needs your call rather than auto-delete. |

**Documentation drift** (CLAUDE.md describes these as adopted; reality shows zero live usage):

| ID | Component | Note |
|---|---|---|
| DRIFT-01 | `<FormSection>` | Zero usages anywhere. |
| DRIFT-02 | `<DetailTabs>` | Only used by DEAD-06 (itself dead) → effectively zero live usages. |
| DRIFT-03 | `<ResizableBottomPane>` | Zero usages anywhere. |

**Correctness / robustness:**

| ID | File | Note |
|---|---|---|
| ROBUST-01 | `components/mobile/mobile-swipe-tabs.tsx` | Imports `@radix-ui/react-tabs` directly — not a declared dependency, only resolves as a transitive dep of the bundled `radix-ui` package. Every other primitive imports from `radix-ui` instead. A future version bump could silently break this. |

**Unused dependencies:**

| ID | Package | Note |
|---|---|---|
| DEP-01 | `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@hookform/resolvers`, `react-hook-form`, `cmdk`, `jspdf`, `pdf-lib` | Zero source references. `jspdf`/`pdf-lib` in particular contradict CLAUDE.md, which says invoice PDFs "use jspdf/pdf-lib" — actual implementation is `window.print()`. |

### Context7

Not connected at run start; connected mid-run (`claude mcp add --transport http
context7 https://mcp.context7.com/mcp`) but tools aren't loaded into this
already-running session. No library checks were verified against it this run —
tools will be available next session.

### Lint warnings (91, pre-existing, not fixed this run)

Mostly `@typescript-eslint/no-unused-vars` (unused imports, intentionally
prefixed `_` params in `lib/services/supabase-service.ts`, unused `get` in
Zustand stores) and a handful of `react-hooks/exhaustive-deps` warnings across
detail-drawer components. None block build; several sit inside files proposed
for deletion above (DEAD-03, DEAD-06), so left as-is pending your decision.

---

## Run 2 — 2026-07-19 (findings resolution)

Branch: `audit/full-baseline`, continuing from Run 1. Walked every open finding
through go/no-go with the user, applied what was approved, and re-ran
typecheck/lint/build/test after each change. Commits: `cd18f33`, `520ceff`,
`35f4528`, `8f2907b`, `62b1c10`, `ec168f8`.

### Resolved this run

- **DEAD-01 → DEAD-12**: all 12 dead files deleted in one commit (`cd18f33`).
  Re-verified zero-import status against actual import statements (not
  filename substring matches) before deleting — this caught that an initial
  substring-based check would have false-positived on `components/mobile/index.ts`
  and `components/ui/table.tsx` (the words "index" and "table" appear in
  unrelated code), and confirmed `components/ui/separator.tsx`'s only
  importers were the three dialog files removed in the same commit. Corrected
  two CLAUDE.md lines tied to these deletions (language-switcher's actual
  location, mobile's direct-import pattern in place of a nonexistent barrel).
- **DEAD-13** (`520ceff`): trimmed the 17 confirmed-unused exports from
  `lib/types/models.ts`. Re-verification after the DEAD-01–12 deletion landed
  was necessary — 3 of the 17 (`JobCategoryColors`, `isAddressEmpty`,
  `ProjectStatusColors`) had misleading grep hits from files deleted in that
  same run. Kept `JobCategory` and `JOB_CATEGORY_TO_DEPARTMENT`, both
  consumed live by `lib/stores/job-types-store.ts`.
- **ROBUST-01** (`35f4528`): `components/mobile/mobile-swipe-tabs.tsx` now
  imports `{ Tabs as TabsPrimitive } from 'radix-ui'`, matching every other
  primitive, instead of the undeclared transitive `@radix-ui/react-tabs`.
- **DRIFT-01/02/03** (`8f2907b`): annotated `<FormSection>`, `<DetailTabs>`,
  `<ResizableBottomPane>` as currently unused in CLAUDE.md's design-system
  table rather than deleting the files (user's call — doc-only fix, lower
  blast radius than removing UI primitives a future feature might reach for).
  Also corrected the invoice-printing section's incorrect `jspdf`/`pdf-lib`
  claim in the same commit.
- **DEP-01, corrected** (`62b1c10`, `ec168f8`): removed 6 of the 7 flagged
  packages — `@radix-ui/react-dialog`, `@hookform/resolvers`, `cmdk`,
  `jspdf`, `pdf-lib`, `react-hook-form` — and deleted `components/ui/form.tsx`
  (react-hook-form's only importer, a zero-consumer file not on the original
  DEAD list, discovered while verifying this finding).

### Correction to a Run 1 finding

Re-verifying DEP-01 against actual import statements (the same discipline
that caught the DEAD-02/DEAD-11 false positives above) found that
**`@radix-ui/react-popover` was misidentified as unused**. It's imported
directly by `components/ui/searchable-select.tsx` (12 live consumers — this
is the CLAUDE.md-mandated component for option lists over ~8 items),
`multi-search-select.tsx`, `popover.tsx`, and `project-detail-panel.tsx`.
Removing it would have broken the build immediately. Left installed;
flagged to the user before proceeding rather than executing the original
finding as stated.

### Post-run state

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors, 89 warnings (pre-existing, 2 fewer than Run 1 since two warning-bearing files were deleted) |
| `npm run build` | ✅ pass |
| `npm run test` | ✅ 85/85 |

`open_findings` is now empty. Branch is awaiting the user's merge decision.
