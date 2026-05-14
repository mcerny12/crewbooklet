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

### Database setup (first time)

Run migration files in this order in Supabase Dashboard → SQL Editor:

1. `migration-2026-03-19.sql` — base schema
2. `migration-attachments.sql`
3. `migration-calendar.sql`
4. `migration-invoices.sql`
5. `migration-roles.sql` — RBAC
6. `migration-job-types.sql`
7. `migration-aconto.sql`
8. `migration-fix-invoice-numbers.sql`

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
- `proxy.ts` — Contains middleware logic (auth enforcement, admin-only route guard) **but is NOT active**. The file is named `proxy.ts` (not `middleware.ts`) and exports `proxy` (not `middleware`), so Next.js does not run it automatically. There is no `middleware.ts` at the project root. Auth is enforced client-side by `MainLayout` and `AuthProvider`.

### Admin panel

`/admin` (guarded to `admin` role by `MainLayout`) has two tabs:
- **Users** — lists all Supabase users, lets admins change roles. Backed by `/api/admin/users` (GET + PATCH), which uses `createSupabaseAdminClient` (service-role key) to read/write `app_metadata.role`.
- **Job Types** — CRUD for the database-driven job type list via `useJobTypesStore`.

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

Invoice PDF is rendered at `/invoices/[id]/print` (a separate print-optimized page). Triggered via `window.open(...)` from the detail panel. Uses `jspdf` / `pdf-lib`.

### Aconto invoices

An "aconto" (advance payment) invoice has `is_aconto: true` and its `aconto_invoice_ids` array references the IDs of the invoices it covers. Handle this flag when rendering invoice totals or linking invoice records.

### Calendar ICS feed

`/api/calendar/[token]` is a **public** endpoint (no auth, bypassed in middleware) that serves an ICS file for a shared `ProjectCalendar`. The `share_token` on `ProjectCalendar` acts as the bearer credential.

### `AssignmentStatus` enum key naming

The enum keys use German words (`Gebucht`, `Angefragt`, etc.) but the values are English display strings (`"Booked"`, `"Inquired"`, etc.). Always use the enum key in code; never hardcode the string value.

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
| `<FormSection>` | `components/ui/form-section.tsx` | Section card with styled header for detail pane groupings |
| `<ProjectStatusBadge>` | `components/ui/status-badge.tsx` | Consistent project status pill |
| `<InvoiceStatusBadge>` | `components/ui/status-badge.tsx` | Consistent invoice status pill |
| `<AvailabilityBadge>` | `components/ui/status-badge.tsx` | Crew availability pill |
| `<DetailTabs>` | `components/ui/detail-tabs.tsx` | Tab bar for detail panes (pass `tabs`, `activeTab`, `onTabChange`) |
| `<EntryMetadata>` | `components/ui/entry-metadata.tsx` | Created/updated timestamps at the bottom of detail panes |
| `<MultiSelect>` | `components/ui/multi-select.tsx` | Badge-style multi-value dropdown for small fixed lists |
| `<BottomDrawer>` | `components/ui/bottom-drawer.tsx` | Resizable mobile bottom sheet — draggable handle, vh-based height (20–85vh) |
| `<ResizableBottomPane>` | `components/ui/resizable-bottom-pane.tsx` | Fixed-half-height bottom pane with close chevron; for split-panel layouts |

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

Full-screen mobile detail views (`*-mobile-detail.tsx`) are built from the `components/mobile/` barrel (`@/components/mobile`):

| Component | Purpose |
|---|---|
| `<MobileEntityDetailLayout>` | Full-screen overlay with back header, summary slot, and footer |
| `<MobileSwipeTabs>` | Swipeable tab bar for mobile detail sections |
| `<MobileField>` | Labelled field row; `mobileInputCn` / `mobileTextareaCn` / `mobileSelectCn` helpers for consistent sizing |
| `<MobileSectionCard>` | Grouped card with header, mirrors desktop `.section-card` |
| `<MobileEmptyState>` | Empty placeholder for empty lists within mobile details |
| `<MobileAppHeader>` | Top bar with back/hamburger modes used by `MobileEntityDetailLayout` |
