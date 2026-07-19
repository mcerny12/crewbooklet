# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server (Turbopack) — http://localhost:3000
npm run build      # Production build
npm run typecheck  # TypeScript check (no emit)
npm run lint       # ESLint
```

No test suite exists. Validate changes by running `npm run typecheck` and `npm run lint`.

### Database migrations

The project uses the Supabase CLI workflow. `supabase/migrations/` is the source of truth — the remote tracker (`supabase_migrations.schema_migrations`) is in sync with the file timestamps via `supabase db pull` / `db push`.

```bash
# Auth (one-time per machine — env var or `npx supabase login`)
export SUPABASE_ACCESS_TOKEN=<personal access token>
export SUPABASE_DB_PASSWORD=<project db password>
npx supabase link --project-ref ijrcjiziezunjaakmtln

# Adding a new schema change
npx supabase migration new <slug>           # creates supabase/migrations/<ts>_<slug>.sql
# edit the SQL, then:
npx supabase db push --dry-run              # shows what will run
npx supabase db push                        # production — get explicit approval first
npx supabase migration list                 # confirm local == remote
```

Do **not** run SQL directly in the Supabase Dashboard once a migration is needed — it bypasses tracking and creates drift. If a remote change has already happened manually, use `npx supabase db pull` to capture it as a baseline migration before adding new files on top.

Pre-CLI migrations were applied via Dashboard before the CLI workflow was adopted and are now baked into the first `supabase/migrations/` file — there is no separate `_legacy-migrations/` directory in the repo. **Do not re-run them.**

### Environment variables (`.env.local`)

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

---

## Architecture

**CrewBooklet** is a film production crew management app. Stack: Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, shadcn/ui + Radix, Supabase (PostgreSQL + RLS), Zustand, Vercel.

### Data flow

```
Supabase DB → SupabaseService (static class) → Zustand stores → React components
```

- `lib/services/supabase-service.ts` — all DB operations in one static class. Never query Supabase directly from components.
- `lib/stores/` — one Zustand store per domain (people, projects, organizations, invoices, calendar, project-assignments, job-types, auth). Stores call `SupabaseService` and hold client-side state.
- `lib/supabase/client.ts` — browser client (used by service layer). `lib/supabase/server.ts` — SSR client (API routes). `lib/supabase/admin.ts` — service-role client (admin API only).
- `proxy.ts` — **Is active.** In Next.js 16, `middleware.ts` was renamed to `proxy.ts` as the framework convention (a root-level `proxy.ts` exporting a named `proxy` function plus `config.matcher` is auto-detected and run on every matched request — confirmed by `ƒ Proxy (Middleware)` in `next build` output). It validates the Supabase session server-side (`getClaims()` — validated locally against the project's asymmetric JWT signing keys, no Auth-server round-trip), redirects unauthenticated requests to `/login`, exempts the public `/api/calendar/[token]` ICS endpoint and the auth pages, and redirects non-admins away from `/admin`. Auth is therefore enforced **both** server-side here **and** client-side by `MainLayout`/`AuthProvider` — not client-side only.

### Settings page

`/settings` (`components/settings/settings-shell.tsx`) is the unified settings hub. It shows three sections, with admin-only sections hidden from non-admins:
- **General** — user preferences (language switcher backed by `user_settings` DB table via `useUserSettings()`).
- **Admin: Users** — lists all Supabase users, lets admins change roles. Backed by `/api/admin/users` (GET + PATCH), which uses `createSupabaseAdminClient` (service-role key) to read/write `app_metadata.role`.
- **Admin: Job Types** — CRUD for the database-driven job type list via `useJobTypesStore`.

`/admin` is a legacy redirect: admins land at `/settings?section=admin-users`, everyone else at `/settings`. The `/api/admin/*` routes still enforce admin-only access independently.

### Auth & permissions

`AuthProvider` (`components/providers/auth-provider.tsx`) runs at root, calls `useAuthStore.initialize()` and pre-fetches job types. `MainLayout` redirects unauthenticated users to `/login`.

User role is in `app_metadata.role` (Supabase). Use `usePermissions()` from `lib/hooks/use-permissions.ts` to gate UI — it returns `{ canCreate, canEdit, canDelete, isAdmin, isViewer }`.

| Role | Read | Create / Edit / Delete | Admin panel |
|---|:---:|:---:|:---:|
| `admin` | ✓ | ✓ | ✓ |
| `user` | ✓ | ✓ | |
| `viewer` | ✓ | | |

Roles live in `app_metadata` (service-role protected — users cannot self-promote). The first admin must be set via Supabase Dashboard → SQL Editor or the admin API directly.

### Page pattern

All pages are `'use client'`. Each domain page (`/people`, `/projects`, `/organizations`, `/invoices`) follows the same master-detail pattern:
- Top: `<PageHeader>` with title, count, search, and primary action
- Middle: filtered list using compact list-item components
- When an item is selected: detail pane takes over the whole content area
- Detail panes use 1000ms debounce auto-save — **no explicit save buttons**

On desktop the detail pane renders inline (full content area). On mobile, `*-detail-drawer.tsx` files (people, orgs) and `*-detail-panel.tsx` files (projects, invoices) check `useIsMobile()` and delegate to the corresponding `*-mobile-detail.tsx` component, which uses `MobileEntityDetailLayout` for a full-screen overlay experience.

Add-dialogs (e.g., `AddPersonDialog`) use plain `useState` for form state — no `react-hook-form`.

#### Cross-entity drill navigation

Pages support navigating to a related entity from within a detail pane (e.g., clicking a project link from a person's detail). This is handled via a `DrillTarget` union state in the page component:

```tsx
type DrillTarget = { type: 'project'; item: Project } | { type: 'org'; item: Organization };
const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
```

When `drillTarget` is set, it renders the target entity's detail pane instead of the primary selection. Closing the drilled pane returns to `null`, which restores the primary detail.

### Job types

Job types are **database-driven**, not purely static. `useJobTypesStore` holds `JobTypeRecord[]` (from DB — `id`, `name`, `category`, `sort_order`) fetched on app load. The static `JobType` enum in `lib/types/models.ts` is a reference/fallback only; always use `useJobTypesStore` when rendering job type options in forms. The store exposes `getCategoryForJob(name)` and `getDepartmentForJob(name)` helpers.

### Invoice printing

Invoice PDF is rendered at `/invoices/[id]/print` (a separate print-optimized page). Triggered via `window.open(...)` from the detail panel; the browser's native `window.print()` produces the PDF — there is no `jspdf` / `pdf-lib` dependency in the actual implementation. Invoice total calculations (net, VAT, gross, aconto deductions) live in `lib/invoice/totals.ts` — use those helpers rather than re-deriving in components.

### Aconto, storno, and revision invoices

**Aconto** (advance payment): `is_aconto: true` marks an advance invoice. Final invoices deduct acontos via the `invoice_aconto_applications` table (snapshots the source amount/number/date at link time). The legacy `aconto_invoice_ids` array field on `Invoice` is deprecated — read `aconto_applications` instead.

**Storno** (Rechnungskorrektur): a cancellation invoice linked via `storno_invoice_id` on the original and `storno_reason` / `storno_date` on the storno record. Status `StornoInvoice` / `RevisionDraft`.

**Revision**: a corrected replacement invoice linked via `revision_of_invoice_id` (points back to the original). `revision_sequence` tracks the revision number (1 = first revision); invoice numbers get `-rev` / `-rev-01` suffixes. When creating a revision, copy the original's aconto applications via `SupabaseService.copyAcontoApplicationsForRevision`.

### Calendar ICS feed

`/api/calendar/[token]` is a **public** endpoint (no auth, bypassed in middleware) that serves an ICS file for a shared `ProjectCalendar`. The `share_token` on `ProjectCalendar` acts as the bearer credential.

### Internationalisation (i18n)

The app ships in German (default) and English via [`next-intl`](https://next-intl.dev). Locale is **cookie-based** (`cb_locale`) — no `/de` / `/en` route segments — so existing URLs stay stable across languages.

- **Config:** [`i18n/routing.ts`](i18n/routing.ts) (locale list, cookie name, default) + [`i18n/request.ts`](i18n/request.ts) (reads the cookie server-side, loads `messages/<locale>.json`).
- **Provider:** [`app/layout.tsx`](app/layout.tsx) is now an async server component that fetches the locale and wraps everything in `<NextIntlClientProvider>`. All client components below can `useTranslations(...)` directly.
- **Switcher:** lives inline in [`components/settings/general-section.tsx`](components/settings/general-section.tsx) (Settings → General), not in the sidebar. Writes both the `cb_locale` cookie (read by `next-intl` at render time) **and** `user_settings.app_language` in the DB (via `useUserSettings()`) so the preference persists across devices. Triggers `window.location.reload()` to refresh server-rendered messages.
- **Translation files:** [`messages/de.json`](messages/de.json) and [`messages/en.json`](messages/en.json). Keys are organised by domain (`common`, `navigation`, `auth`, `dashboard`, `people`, `projects`, `organizations`, `invoices`, `invoicePdf`, `calendar`, `admin`, `search`, plus enum dictionaries `assignmentStatus`, `departments`, `gender`, `languages`, `roles`). Both files must keep the same key shape.
- **Status badges** in [`components/ui/status-badge.tsx`](components/ui/status-badge.tsx) translate their *labels* but keep the colour classes keyed on the raw enum value, so colours never change across locales.

#### Jobs / roles are data, not UI

Job titles, custom job names, person/org/project names, addresses, IBANs etc. are **never** translated — they're stored exactly as the user entered them. Only the surrounding labels (`Job`, `Add job`, `No job assigned`, `Department`, …) come from the dictionary. Status enums follow the same rule: stored values (`PRODUCTION`, `paid`, `Booked`, …) are unchanged; their displayed labels live under `projects.status.*`, `invoices.status.*`, `assignmentStatus.*`.

#### Invoice PDFs: `document_language` is frozen at finalization

The invoice PDF route ([`app/invoices/[id]/print/page.tsx`](app/invoices/[id]/print/page.tsx)) does **not** use the current app locale. It resolves [`invoice.document_language`](lib/i18n/document-language.ts) (added by migration [`20260517071611_invoice_document_language.sql`](supabase/migrations/20260517071611_invoice_document_language.sql)) and wraps the print render in its own `<NextIntlClientProvider locale={docLocale} messages={…}>`. This is so issued PDFs don't silently change language when a user switches the app later.

- New drafts pick up the current app locale (set by [`AddInvoiceDialog`](components/invoices/add-invoice-dialog.tsx)).
- Drafts with `document_language` still NULL fall back to the current app locale via [`resolveInvoiceDocumentLanguage`](lib/i18n/document-language.ts).
- Once an invoice is finalised, its language is part of the audit trail and should not be rewritten.

The PDF-specific labels live under the `invoicePdf` namespace in the messages files — keep them separated from the regular UI namespace so PDF terminology can drift without affecting the live app strings.

#### Date / number / currency formatting

Use `useFormatter()` from `next-intl` (it picks up the current locale automatically). `react-big-calendar` is wired to both English and German `date-fns` locales in [`components/calendar/calendar-main.tsx`](components/calendar/calendar-main.tsx); its toolbar labels come from a `messages` prop derived from the `calendar` namespace.

#### Audit script

`node scripts/audit-i18n-hardcoded-strings.mjs` ([`scripts/audit-i18n-hardcoded-strings.mjs`](scripts/audit-i18n-hardcoded-strings.mjs)) scans `app/`, `components/`, and `lib/` for likely-untranslated JSX text and attributes. It's a tripwire, not a proof — but is useful before merging any PR that adds UI strings.

### Visual feedback overlay

`components/feedback/` provides a designer-style element inspector wired into `app/layout.tsx` via `<FeedbackProvider>`. It is dormant by default and only activates when the URL carries `?feedback=1`. When active, users can click DOM elements, attach notes via `FeedbackDialog`, and export the collected items as XML (`export-feedback.ts`). State persists to `localStorage` under `cb_feedback_items_v1`; sensitive inputs are filtered by `element-inspector.ts`. Only call `useFeedback()` from components rendered beneath this provider.

### `AssignmentStatus` enum key naming

The enum keys use German words (`Gebucht`, `Angefragt`, etc.) but the values are English display strings (`"Booked"`, `"Inquired"`, etc.). Always use the enum key in code; never hardcode the string value.

### Audit guide

`AUDIT.md` at the repo root is an operating manual for diagnosing the codebase, DB schema, data integrity, RLS, and accounting invariants. Consult it before any data-repair or schema-change work. It is read-only by design — repair operations require separate explicit approval.

---

## Design system

### Design tokens (globals.css)

CSS variables in `:root`:
- `--primary` — brand blue (`#2563eb` equivalent in oklch)
- `--background` — off-white page background (`#f8fafc` equivalent)
- `--card` — white card/surface background
- `--border` — slate-200 borders
- `--ring` — brand blue focus ring (same as `--primary`)
- `--muted-foreground` — slate-500 secondary text

### Utilities

`cn(...inputs)` from `lib/utils.ts` — `clsx` + `tailwind-merge` class utility. Use for all conditional className construction.

### Reusable UI components

| Component | File | Purpose |
|---|---|---|
| `<PageHeader>` | `components/ui/page-header.tsx` | Title, subtitle/count, search slot, filter slot, actions slot |
| `<MobilePageHeader>` | `components/layout/mobile-page-header.tsx` | Mobile top bar (hamburger + title + optional right action); use alongside `<PageHeader>` in domain pages — `<PageHeader>` for desktop, `<MobilePageHeader>` for mobile |
| `<FormSection>` | `components/ui/form-section.tsx` | Section card with styled header for detail pane groupings — **currently unused** (`.section-card` CSS classes below are the pattern actually in use); kept as an available alternative, not a live dependency |
| `<ProjectStatusBadge>` | `components/ui/status-badge.tsx` | Consistent project status pill |
| `<InvoiceStatusBadge>` | `components/ui/status-badge.tsx` | Consistent invoice status pill |
| `<AvailabilityBadge>` | `components/ui/status-badge.tsx` | Crew availability pill |
| `<DetailTabs>` | `components/ui/detail-tabs.tsx` | Tab bar for detail panes (pass `tabs`, `activeTab`, `onTabChange`) — **currently unused** (no live consumer) |
| `<EntryMetadata>` | `components/ui/entry-metadata.tsx` | Created/updated timestamps at the bottom of detail panes |
| `<MultiSelect>` | `components/ui/multi-select.tsx` | Badge-style multi-value dropdown for small fixed lists |
| `<BottomDrawer>` | `components/ui/bottom-drawer.tsx` | Resizable mobile bottom sheet — draggable handle, vh-based height (20–85vh) |
| `<ResizableBottomPane>` | `components/ui/resizable-bottom-pane.tsx` | Fixed-half-height bottom pane with close chevron; for split-panel layouts — **currently unused** (no live consumer) |

### Form fields in detail panels

Detail panels wrap form sections in `<div className="detail-form-fields">` (or `section-card-body` via `FormSection`). A global CSS rule in `globals.css` upgrades inputs inside `.detail-form-fields` to 34px height and 13px font size — no need to override `h-7 text-xs` individually.

For form fields inside detail panes, continue using `h-7 text-xs` on individual inputs — the `.detail-form-fields` CSS override handles the visual upgrade. For new standalone forms (dialogs, add-forms), use `h-9` or `h-10` inputs directly.

### Section cards

Use `.section-card` / `.section-card-header` / `.section-card-body` CSS classes (defined in `globals.css`) for grouping related fields in detail panes. These produce a white card with a muted header bar.

```tsx
<div className="section-card">
  <div className="section-card-header">Personal</div>
  <div className="section-card-body space-y-1.5 detail-form-fields">
    {/* fields */}
  </div>
</div>
```

### Selected list row state

Use the `.list-row-selected` CSS class on list rows when selected. It applies a brand-blue tinted background and a 3px left accent bar. Do not use only `bg-blue-50`.

### Status colors

All status badges should use `ProjectStatusBadge`, `InvoiceStatusBadge`, or `AvailabilityBadge` from `components/ui/status-badge.tsx` instead of ad-hoc badge color classes.

---

## UI rules

### Never invent subheadlines or taglines

Do not add subtitles, taglines, or descriptive subheadlines (e.g. "Production management" under the brand, or "Overview of your crew, projects, and upcoming dates." under "Dashboard") that aren't explicitly requested or already present in the design. If a page or component only has a title in the spec, render only the title. Generated filler copy is removed on sight.

### No plain dropdowns for large option lists

**Never** use `<Select>` / `<SelectContent>` for lists with more than ~8 options.  
Use `<SearchableSelect>` from `@/components/ui/searchable-select` instead.

**SearchableSelect shows NO results until the user types.**

Must use `SearchableSelect`:
- Country fields (`FILM_COUNTRIES` — 34 options)
- `JobType` / role fields (40+ options)
- `OrganizationJobType` fields (20 options)
- `CrewDepartment` fields (19 options)
- Any entity selection (people, organizations, projects)

Plain `<Select>` is fine for:
- Gender (3), Language (5), ProjectStatus (6), AssignmentStatus (9)
- Any fixed list with fewer than ~8 options

```tsx
import { SearchableSelect } from '@/components/ui/searchable-select';

// Enum / constant list:
<SearchableSelect
  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
  value={country || null}
  onChange={(v) => setCountry(v ?? '')}
  placeholder="Search country..."
/>

// Entity (person / org / project):
<SearchableSelect
  options={people.map(p => ({ id: p.id, label: p.name, sublabel: p.jobs?.[0] }))}
  value={selectedPersonId}
  onChange={setSelectedPersonId}
  placeholder="Search person..."
/>
```

### Auto-save pattern

Detail views (person, org, project) use a 1000ms debounce auto-save.  
Do not add explicit save buttons to detail forms — changes save automatically.

### Page headers

Every main page must use `<PageHeader>` from `components/ui/page-header.tsx` instead of a plain toolbar `<div>`. Pass `title`, `subtitle` (count string), `search`, and `actions` props.

### Sidebar navigation

The sidebar (`components/layout/sidebar.tsx`) is 252px wide with white background. Nav items use `h-9 rounded-lg` and the active state applies `bg-primary/10 text-primary` with a 3px left shadow accent. Nav items are defined in `components/layout/nav-config.ts` (`primaryNavItems` / `adminNavItems`) — update that file to add or remove routes, not `sidebar.tsx` directly.

The sidebar has a three-state responsive model managed by `SidebarProvider` / `useSidebar()` from `components/layout/sidebar-context.tsx`: desktop-expanded, desktop-collapsed (icon-only), and mobile (full-width overlay). On mobile, `MainLayout` renders a `MobileNavBar` with a hamburger that opens the overlay. Use the breakpoint hooks from `lib/hooks/use-media-query.ts` for conditional rendering:

| Hook | Breakpoint |
|---|---|
| `useIsMobile()` | ≤ 767px |
| `useIsTablet()` | 768–1023px |
| `useIsTabletOrMobile()` | ≤ 1023px |
| `useIsDesktop()` | ≥ 1024px |

### Mobile component system

Full-screen mobile detail views (`*-mobile-detail.tsx`) are built from individual files under `components/mobile/` (imported directly, e.g. `@/components/mobile/mobile-entity-detail-layout` — there is no barrel re-export):

| Component | Purpose |
|---|---|
| `<MobileEntityDetailLayout>` | Full-screen overlay with back header, summary slot, and footer |
| `<MobileSwipeTabs>` | Swipeable tab bar for mobile detail sections |
| `<MobileField>` | Labelled field row; `mobileInputCn` / `mobileTextareaCn` / `mobileSelectCn` helpers for consistent sizing |
| `<MobileSectionCard>` | Grouped card with header, mirrors desktop `.section-card` |
| `<MobileEmptyState>` | Empty placeholder for empty lists within mobile details |
| `<MobileAppHeader>` | Top bar with back/hamburger modes used by `MobileEntityDetailLayout` |
