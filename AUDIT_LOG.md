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
