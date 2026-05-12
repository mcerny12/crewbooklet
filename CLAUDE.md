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

### Auth & permissions

`AuthProvider` (`components/providers/auth-provider.tsx`) runs at root, calls `useAuthStore.initialize()` and pre-fetches job types. `MainLayout` redirects unauthenticated users to `/login`.

User role is in `app_metadata.role` (Supabase). The three roles are `admin`, `user`, `viewer`. Use `usePermissions()` from `lib/hooks/use-permissions.ts` to gate UI — it returns `{ canCreate, canEdit, canDelete, isAdmin, isViewer }`.

### Page pattern

All pages are `'use client'`. Each domain page (`/people`, `/projects`, `/organizations`, `/invoices`) follows the same master-detail pattern:
- Top: `<PageHeader>` with title, count, search, and primary action
- Middle: filtered list using compact list-item components
- When an item is selected: detail pane takes over the whole content area
- Detail panes use 1000ms debounce auto-save — **no explicit save buttons**

### Job types

Job types are **database-driven**, not purely static. `useJobTypesStore` holds DB records fetched on app load. Static `JobType` enum in `lib/types/models.ts` is used as a fallback/reference; the live list comes from the store. Always prefer `useJobTypesStore` when rendering job type options in forms.

### Invoice printing

Invoice PDF is rendered at `/invoices/[id]/print` (a separate print-optimized page). Triggered via `window.open(...)` from the detail panel. Uses `jspdf` / `pdf-lib`.

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

### Reusable UI components

| Component | File | Purpose |
|---|---|---|
| `<PageHeader>` | `components/ui/page-header.tsx` | Title, subtitle/count, search slot, filter slot, actions slot |
| `<FormSection>` | `components/ui/form-section.tsx` | Section card with styled header for detail pane groupings |
| `<ProjectStatusBadge>` | `components/ui/status-badge.tsx` | Consistent project status pill |
| `<InvoiceStatusBadge>` | `components/ui/status-badge.tsx` | Consistent invoice status pill |
| `<AvailabilityBadge>` | `components/ui/status-badge.tsx` | Crew availability pill |

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

The sidebar (`components/layout/sidebar.tsx`) is 252px wide with white background. Nav items use `h-9 rounded-lg` and the active state applies `bg-primary/10 text-primary` with a 3px left shadow accent. Do not add new nav items without updating the sidebar component.
