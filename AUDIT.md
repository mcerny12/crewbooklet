# AUDIT.md

Operating manual for auditing the CrewBooklet codebase, UI, Supabase database, data integrity, security, accounting logic, and deployment readiness. This document is intentionally exhaustive — copy commands and SQL snippets directly into an audit session. **Read-only by default.** Repair, schema changes, and destructive operations are out of scope for an audit run and require explicit, separate approval.

---

## 1. Purpose

This file exists so that any future Claude Code session (or human reviewer) can perform a complete, repeatable audit of CrewBooklet without having to rediscover the project context, the safe commands, or the accounting and data-integrity invariants. An "audit" here means *diagnose and report* — never *modify production state*.

The audit should answer four questions on every run:

1. Is the codebase internally consistent (types, components, i18n, mobile/desktop)?
2. Is the Supabase schema in sync with the repo and free of drift?
3. Is the data inside the database internally consistent (no orphans, no duplicate invoice numbers, no broken aconto/storno chains)?
4. Is the application safe to deploy (RLS correct, no secrets leaked, build green)?

---

## 2. Project context

CrewBooklet is a Next.js 16 (App Router) production-management web app for film crews. Stack: TypeScript strict, Tailwind 4, shadcn/ui + Radix, Supabase (Postgres + RLS), Zustand, Vercel.

Domains and where they live:

| Domain | Pages | Components | Store |
|---|---|---|---|
| People | `app/people/` | `components/people/` | `lib/stores/people-store.ts` |
| Projects | `app/projects/` | `components/projects/` | `lib/stores/projects-store.ts` |
| Organizations | `app/organizations/` | `components/organizations/` | `lib/stores/organizations-store.ts` |
| Invoices | `app/invoices/` | `components/invoices/` | `lib/stores/invoices-store.ts` |
| Calendar | `app/calendar/` | `components/calendar/` | `lib/stores/calendar-store.ts` |
| Admin | `app/admin/` | — | `lib/stores/auth-store.ts`, `lib/stores/job-types-store.ts` |

Cross-cutting:

- **Service layer:** [lib/services/supabase-service.ts](lib/services/supabase-service.ts) — all DB operations.
- **Invoice/PDF logic:** [lib/invoice/](lib/invoice/), printed at `app/invoices/[id]/print/`.
- **Auth:** `AuthProvider` + `MainLayout` + `usePermissions()` (`app_metadata.role` ∈ `admin | user | viewer`).
- **Migrations:** `supabase/migrations/` (source of truth). Legacy pre-CLI SQL in `_legacy-migrations/` is reference only.
- **Public endpoint:** `/api/calendar/[token]` (ICS feed, no auth, bearer token in URL).
- **i18n / document language:** Invoices store `document_language` so PDFs render consistently after a language switch.
- **Accounting-sensitive flows:** aconto (advance payment) deduction, storno (Rechnungskorrektur), revision invoices with `-rev`, `-rev-01`, … numbering.

Known public tables (per `supabase/migrations/20260516193848_remote_schema.sql`):

```
projects, calendar_events, calendars, documents, events,
invoice_aconto_applications, invoice_attachments, invoice_events,
invoice_items, invoices, job_types, organizations, people,
project_assignments, project_calendars, user_profiles
```

> Note: SQL snippets below use these table names where known. Column names marked with **(verify)** must be confirmed against the live schema before running — column names can drift faster than table names.

---

## 3. Audit principles

1. **Diagnose, do not repair.** An audit run produces a report, never a write.
2. **Read-only by default.** Any SQL run during audit must be `SELECT` only.
3. **One change at a time.** If the audit produces a fix, propose it as a separate migration/PR; never bundle "discovery" and "remediation" in one go.
4. **No secrets in artifacts.** Audit notes, AUDIT.md, generated dumps, and PR descriptions must not contain access tokens, DB passwords, service-role keys, or connection strings.
5. **Prefer staging.** If a staging Supabase project exists, run schema-changing or dump operations there first.
6. **Stop on surprise.** If the schema differs from `supabase/migrations/`, stop and surface it — do not auto-pull or auto-repair.

---

## 4. Safety rules before auditing

**Never run during an audit:**

- `npx supabase db reset --linked` — destroys the linked database.
- `npx supabase migration repair` — rewrites migration history; needs an explicit, diagnosed reason.
- `DROP`, `DELETE`, `TRUNCATE`, destructive `ALTER` against any schema.
- `npx supabase db push` (the non-`--dry-run` form) without explicit approval and a reviewed migration file.
- Any command that writes to `app_metadata.role` outside the admin API.
- Committing `.env.local`, `supabase-audit-schema.sql` containing data, or any file containing tokens.

**Conditional, only with explicit approval:**

- `npx supabase db pull` — creates a new migration capturing remote drift. Review carefully before commit.
- `npx supabase db dump --schema public --file supabase-audit-schema.sql` — schema-only artifact. Do not commit if it leaks environment-specific names or comments.

If in doubt: stop, write up the finding, ask the user.

---

## 5. Required environment and access

Audit Claude needs read access to the repo and (for the database section) Supabase credentials passed through the local environment only.

**Never paste secrets into AUDIT.md, commit messages, or PR descriptions.** Set them in the shell:

```bash
# Do not commit these. Source from a password manager or 1Password CLI.
export SUPABASE_ACCESS_TOKEN="..."
export SUPABASE_DB_PASSWORD="..."

npx supabase link --project-ref YOUR_PROJECT_REF   # ref is non-secret
npx supabase migration list
```

Required local env for the app build:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/admin/*` only — must never reach the browser bundle |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs in PDFs / emails |

Production database audits must be read-only unless the user explicitly approves a migration. Prefer staging when available.

---

## 6. Codebase inventory audit

Goal: a one-page picture of what exists, before judging it.

```bash
git status --short
git branch --show-current
git log --oneline -20

# File counts per domain
find app components lib -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l
find app -type f -name "page.tsx" | sort
find components -maxdepth 1 -type d
find lib/services lib/stores lib/invoice -type f

# Heavy files (anything > 500KB outside node_modules/.next is suspicious)
find . -type f -size +500k -not -path "./node_modules/*" -not -path "./.next/*"

# Public API surface
find app/api -type f -name "route.ts"
```

Record: number of routes, number of stores, number of components per domain, presence of any duplicate or "v2" file names.

---

## 7. Dead code and unused dependency audit

```bash
# Find TODO/FIXME/HACK and TS escape hatches
grep -RIn "TODO\|FIXME\|HACK\|@ts-ignore\|@ts-expect-error" app components lib \
  --include="*.ts" --include="*.tsx"

# Find ad-hoc `any`
grep -RIn ": any\b\| as any\b\|<any>" app components lib \
  --include="*.ts" --include="*.tsx"

# Unused dependencies and outdated versions
npm outdated
npm audit
npm ls --depth=0

# Optional: install depcheck for unused deps
npx --yes depcheck

# Optional: ts-prune for unused exports
npx --yes ts-prune | grep -v "(used in module)"
```

Checks:

- Unused components (especially under `components/mobile/` and old `*-detail-panel.tsx` variants).
- Duplicate mobile/desktop logic that has diverged.
- Old invoice helpers in `lib/invoice/` superseded by current logic.
- Repeated Tailwind class blocks that should become a shared component.
- Business logic inside JSX that belongs in a service/helper.
- Unused imports flagged by ESLint.

---

## 8. TypeScript and type-safety audit

```bash
npm run typecheck      # tsc --noEmit
npx tsc --noEmit       # same, but explicit
npm run lint
```

Checks:

- Zero `any` in service layer (`lib/services/`) and store actions.
- Zero `@ts-ignore` / `@ts-expect-error` without an inline justification comment.
- Domain models in `lib/types/models.ts` are the single source of truth — no domain types redeclared in components.
- Supabase generated types (if used) are regenerated when migrations change.
- Enum keys (e.g. `AssignmentStatus.Gebucht`) are referenced by key, never by string literal.

---

## 9. Component and design-system consistency audit

Verify the rules from [CLAUDE.md](CLAUDE.md) hold:

- Every domain page uses `<PageHeader>` (desktop) + `<MobilePageHeader>` (mobile).
- Detail panes use the 1000ms debounce auto-save pattern — **no explicit save buttons**.
- Status pills always use `ProjectStatusBadge` / `InvoiceStatusBadge` / `AvailabilityBadge` — never ad-hoc badge colors.
- Selected list rows use `.list-row-selected`, not raw `bg-blue-50`.
- Form fields in detail panels are wrapped in `.detail-form-fields` so global sizing applies; standalone dialog inputs use `h-9` / `h-10`.
- Lists with > ~8 options use `<SearchableSelect>` (country, job type, org, project, person, crew department), never plain `<Select>`.
- No invented subheadlines / taglines under page titles or brand.
- Sidebar nav items live in `components/layout/nav-config.ts`, not inline in `sidebar.tsx`.

Grep helpers:

```bash
grep -RIn "<Select\b" app components --include="*.tsx" | grep -v "SearchableSelect"
grep -RIn "bg-blue-50" app components --include="*.tsx"
grep -RIn "save\|Save" components --include="*-detail*.tsx"
```

---

## 10. Mobile/responsive UI audit

```bash
# Find all mobile detail variants
find components -name "*mobile-detail.tsx" -o -name "*detail-drawer.tsx" -o -name "*detail-panel.tsx"
```

Checks:

- Each domain has a working `*-mobile-detail.tsx` rendered via `useIsMobile()` from `lib/hooks/use-media-query.ts`.
- Mobile detail screens use `MobileEntityDetailLayout` + `MobileSwipeTabs` + `MobileField` (`mobileInputCn` etc.) from `@/components/mobile`.
- `BottomDrawer` / `ResizableBottomPane` only used where the design calls for a sheet — not as a substitute for the mobile full-screen layout.
- Sidebar three-state model behaves correctly: desktop-expanded, desktop-collapsed (icon-only), mobile (overlay via hamburger).
- No horizontal scroll on the smallest target breakpoint (`useIsMobile()` ≤ 767px).

Manual: spot-check People, Projects, Organizations, Invoices, Calendar on a real mobile viewport (Chrome devtools iPhone 14 Pro).

---

## 11. Language/i18n consistency audit

CrewBooklet supports German and English UI with `document_language` baked into issued invoices so PDFs do not change retroactively.

Checks:

- German mode: every visible UI string is German. Stored data (names, notes, job titles) is shown as entered.
- English mode: every visible UI string is English. Stored data is shown as entered.
- **Jobs/roles are stored values, not translation keys** — never translated at render time.
- Buttons, dialog titles, toasts, empty states, status labels, and PDFs all read from translation files (no hardcoded `"Speichern"` in `.tsx`).
- Mobile and desktop share translation keys where the string is the same.

Grep helpers (adjust to the actual i18n hook used):

```bash
# Hardcoded German strings outside translation files
grep -RIn "Speichern\|Abbrechen\|Löschen\|Hinzufügen" app components \
  --include="*.tsx" | grep -v "i18n\|locales\|translations"

# Untranslated common verbs in TSX
grep -RIn '>\s*\(Save\|Cancel\|Delete\|Add\)\s*<' app components --include="*.tsx"
```

PDF check: issue a test invoice in German, switch UI to English, reopen the PDF — language must not change.

---

## 12. Invoice/accounting logic audit

This is the most accounting-sensitive area of the codebase. Treat it as load-bearing.

Invariants (each must be verified by code-read **and** by a representative DB query in §15):

1. **Normal invoice total** = Σ line items − Σ applied acontos (per the invoice's currency/VAT rules).
2. **Storno (Rechnungskorrektur) total** = exact negative of the invoice it corrects, including reversing aconto deductions.
3. **Original invoice is immutable** once `status` ∈ `{ issued, paid, cancelled, corrected }`. Edits are only possible via a revision invoice.
4. **Revision invoice** copies line items and applied acontos from its source and is linked back to it.
5. **Revision numbering**: `INV-2026-0001` → `INV-2026-0001-rev` → `INV-2026-0001-rev-01` → `INV-2026-0001-rev-02`. Numbers are **never reused**.
6. **Storno documents** are linked to the original invoice (via `original_invoice_id` or `corrects_invoice_id` — **verify** which column the schema uses).
7. **Aconto applications** never apply the same source aconto twice to the same invoice.
8. **PDF totals** equal UI totals to the cent.
9. **PDF language** comes from `invoices.document_language`, not the current UI language.
10. **Aconto applications**: `is_aconto: true` invoices appear in the `aconto_invoice_ids` array of the invoice that consumes them, *and* in `invoice_aconto_applications` if that join table is the source of truth — confirm which.

Code reads:

- [lib/invoice/](lib/invoice/) — totals, rounding, storno generator, revision generator.
- `app/invoices/[id]/print/` — PDF renderer; must read `document_language`.
- `lib/services/supabase-service.ts` — search for invoice mutation methods; confirm there is no path that updates an issued invoice in place.

---

## 13. Supabase migration audit

```bash
npx supabase --version
npx supabase status                 # local emulator status, if running
npx supabase migration list         # local vs remote applied
npx supabase db push --dry-run      # MUST show "no changes" on a clean repo
npx supabase db lint                # lint SQL in supabase/migrations/
```

Pass criteria:

- `migration list` shows the same set on both sides, in the same order.
- `db push --dry-run` reports no pending changes when working tree is clean.
- No file in `supabase/migrations/` has been edited after being applied remotely (timestamps are append-only).
- No SQL has been run via the Supabase Dashboard since the CLI workflow was adopted (commit `a200000`).

If drift is found:

```bash
# Conditional — only with explicit user approval
npx supabase db pull                # captures remote drift into a new migration file
# Review the generated SQL carefully, then commit it as its own PR.
```

> **Never** use `npx supabase migration repair` casually. Diagnose first, document the divergence, get approval.

---

## 14. Supabase database fault audit

Goal: detect schema drift, broken relations, missing foreign keys, orphan records, duplicate data, invalid enum/status values, accounting inconsistencies, and RLS/security risks — **without writing**.

### Safe Supabase CLI commands

```bash
npx supabase inspect db help
npx supabase inspect db bloat
npx supabase inspect db blocking
npx supabase inspect db cache-hit
npx supabase inspect db long-running-queries
npx supabase inspect db locks
npx supabase inspect db index-usage
npx supabase inspect db seq-scans
npx supabase test db                 # runs any pgTAP tests under supabase/tests/
```

### Schema introspection (read-only SQL)

Use the Supabase SQL editor in **read-only** mode or `psql -c` with a connection string that only the operator handles (never logged).

```sql
-- List all tables in the public schema
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Foreign keys present
select tc.table_name, kcu.column_name,
       ccu.table_name as foreign_table, ccu.column_name as foreign_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- Columns that look like an FK by name but have no FK constraint
select c.table_name, c.column_name
from information_schema.columns c
where c.table_schema = 'public'
  and c.column_name like '%_id'
  and not exists (
    select 1
    from information_schema.key_column_usage kcu
    join information_schema.table_constraints tc using (constraint_name)
    where tc.constraint_type = 'FOREIGN KEY'
      and kcu.table_schema = 'public'
      and kcu.table_name = c.table_name
      and kcu.column_name = c.column_name
  )
order by c.table_name, c.column_name;
```

What to look for:

- Tables present remotely but missing from migrations → drift.
- `*_id` columns without a foreign key constraint → integrity risk.
- Foreign keys with `ON DELETE NO ACTION` where `CASCADE` or `SET NULL` was intended (or vice versa).
- Columns whose nullability differs between code expectations and DB.

---

## 15. Database data-integrity SQL checks (read-only)

All queries are `SELECT` only. Adapt column names marked **(verify)** to the actual schema before running.

### 15.1 Duplicate invoice numbers

```sql
select invoice_number, count(*) as count
from public.invoices
where invoice_number is not null
group by invoice_number
having count(*) > 1;
```

### 15.2 Issued/final invoices missing invoice numbers

```sql
select id, status, document_type, created_at
from public.invoices
where status in ('issued', 'paid', 'cancelled', 'corrected')
  and (invoice_number is null or trim(invoice_number) = '');
```

### 15.3 Storno / Rechnungskorrektur not linked to original

```sql
-- (verify) original_invoice_id vs corrects_invoice_id depending on schema
select id, invoice_number, document_type,
       original_invoice_id, corrects_invoice_id
from public.invoices
where document_type in ('storno_invoice', 'correction_invoice', 'rechnungskorrektur')
  and original_invoice_id is null
  and corrects_invoice_id is null;
```

### 15.4 Revision invoices missing source link

```sql
select id, invoice_number, document_type,
       original_invoice_id, revision_of_invoice_id      -- (verify)
from public.invoices
where document_type = 'revision_invoice'
  and original_invoice_id is null
  and revision_of_invoice_id is null;
```

### 15.5 Duplicate revision invoice numbers

```sql
select invoice_number, count(*) as count
from public.invoices
where invoice_number like '%-rev%'
group by invoice_number
having count(*) > 1;
```

### 15.6 Applied acontos whose source invoice is missing

```sql
-- Confirm join table + column names in schema
select aa.*
from public.invoice_aconto_applications aa
left join public.invoices src
  on src.id = aa.source_invoice_id                       -- (verify)
where aa.source_invoice_id is not null
  and src.id is null;
```

### 15.7 Same source aconto applied multiple times to the same invoice

```sql
select invoice_id, source_invoice_id, count(*) as count
from public.invoice_aconto_applications
where source_invoice_id is not null
group by invoice_id, source_invoice_id
having count(*) > 1;
```

### 15.8 Orphan invoice line items

```sql
-- Schema uses invoice_items (not invoice_line_items)
select li.*
from public.invoice_items li
left join public.invoices i on i.id = li.invoice_id
where i.id is null;
```

### 15.9 Project assignments pointing to missing projects

```sql
select pa.*
from public.project_assignments pa
left join public.projects p on p.id = pa.project_id
where p.id is null;
```

### 15.10 Project assignments referencing neither person nor org

```sql
select *
from public.project_assignments
where person_id is null
  and organization_id is null;                            -- (verify column name)
```

### 15.11 Invalid project statuses

```sql
-- Replace with the actual allowed enum values from lib/types/models.ts
select id, name, status
from public.projects
where status is not null
  and status not in ('INQUIRY', 'BUDGET', 'PRODUCTION', 'HOLD', 'COMPLETED', 'CANCELLED');
```

### 15.12 Invalid invoice statuses

```sql
select id, invoice_number, status
from public.invoices
where status is not null
  and status not in ('draft', 'issued', 'paid', 'cancelled', 'corrected', 'revision_draft');
```

### 15.13 People without names

```sql
select id, created_at
from public.people
where name is null or trim(name) = '';
```

### 15.14 Organizations without names

```sql
select id, created_at
from public.organizations
where name is null or trim(name) = '';
```

### 15.15 Issued invoices missing document_language

```sql
select id, invoice_number, document_type, document_language
from public.invoices
where document_language is null
  and status in ('issued', 'paid', 'cancelled', 'corrected');
```

### 15.16 Invoice totals vs line items vs acontos

```sql
-- (verify) column names: total, subtotal, vat_total, total_net, etc.
-- This query flags invoices whose stored total drifts from recomputed line items.
with li as (
  select invoice_id, sum(quantity * unit_price) as line_sum   -- (verify)
  from public.invoice_items
  group by invoice_id
),
ac as (
  select invoice_id, sum(amount) as aconto_sum                -- (verify)
  from public.invoice_aconto_applications
  group by invoice_id
)
select i.id, i.invoice_number, i.total,
       coalesce(li.line_sum, 0)   as line_sum,
       coalesce(ac.aconto_sum, 0) as aconto_sum,
       i.total - (coalesce(li.line_sum, 0) - coalesce(ac.aconto_sum, 0)) as drift
from public.invoices i
left join li on li.invoice_id = i.id
left join ac on ac.invoice_id = i.id
where i.status in ('issued', 'paid', 'cancelled', 'corrected')
  and abs(coalesce(i.total, 0)
         - (coalesce(li.line_sum, 0) - coalesce(ac.aconto_sum, 0))) > 0.01;
```

### 15.17 Storno does not exactly reverse the corrected invoice

```sql
-- Pair each storno with the invoice it corrects and confirm totals net to zero.
select s.id as storno_id, s.invoice_number as storno_number,
       o.id as original_id, o.invoice_number as original_number,
       s.total + o.total as residual                          -- (verify)
from public.invoices s
join public.invoices o
  on o.id = coalesce(s.original_invoice_id, s.corrects_invoice_id)   -- (verify)
where s.document_type in ('storno_invoice', 'rechnungskorrektur')
  and abs(coalesce(s.total, 0) + coalesce(o.total, 0)) > 0.01;
```

### 15.18 Calendar events referencing missing projects

```sql
select ce.*
from public.calendar_events ce
left join public.projects p on p.id = ce.project_id            -- (verify)
where ce.project_id is not null and p.id is null;
```

### 15.19 ProjectCalendar share tokens

```sql
-- Tokens that are short, null, or duplicated represent a security risk on /api/calendar/[token]
select token, length(token) as len, count(*) as count
from public.project_calendars
group by token, length(token)
having count(*) > 1 or length(token) < 24;                      -- (verify column name)
```

---

## 16. Supabase RLS / security audit

```sql
-- Public tables without RLS
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;

-- All policies on public tables
select schemaname, tablename, policyname,
       permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Policies that grant anon broad access
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and 'anon' = any(roles);
```

Checks:

- Every public table has `rowsecurity = true`. Exceptions need a written justification.
- No `anon` policy grants `INSERT/UPDATE/DELETE` unless the table is intentionally public.
- Invoice/bank/private contact data is not readable by `anon`.
- `SUPABASE_SERVICE_ROLE_KEY` is referenced only in `lib/supabase/admin.ts` and files under `app/api/admin/`. Anywhere else is a bug.
- The ICS endpoint `/api/calendar/[token]` validates the token strictly and returns 404 (not 401) on miss to avoid token enumeration.
- Storage buckets (if any) have policies that match invoice-PDF privacy expectations.

Grep helper:

```bash
grep -RIn "SUPABASE_SERVICE_ROLE_KEY\|service_role" app components lib --include="*.ts" --include="*.tsx"
grep -RIn "createSupabaseAdminClient" app components lib --include="*.ts" --include="*.tsx"
```

The admin client must only appear under `app/api/admin/` (and the file that defines it).

---

## 17. Supabase performance and health audit

```bash
npx supabase inspect db cache-hit
npx supabase inspect db index-usage
npx supabase inspect db seq-scans
npx supabase inspect db long-running-queries
npx supabase inspect db bloat
```

Manual SQL checks:

```sql
-- Largest tables (size on disk)
select relname, pg_size_pretty(pg_total_relation_size(relid)) as size
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc
limit 20;

-- Unused indexes (idx_scan = 0)
select schemaname, relname, indexrelname, idx_scan
from pg_stat_user_indexes
where schemaname = 'public' and idx_scan = 0
order by relname;
```

What to look for:

- `cache-hit` ratio < 0.99 → working set doesn't fit in memory.
- Sequential scans on large tables → missing index.
- Indexes never used → candidate for removal (proposed in a separate PR, not now).

---

## 18. Accessibility audit

- Every interactive element reachable by keyboard, with a visible focus ring (`--ring`).
- Every form input has an associated `<label>` (or `aria-label` on icon buttons).
- Dialogs trap focus and restore it on close (Radix handles this — verify nothing overrides).
- Color contrast on status pills meets WCAG AA (white on `--primary`; muted text on `--card`).
- Images / icons that convey meaning have `alt` or `aria-label`.
- `MobilePageHeader` hamburger has an accessible name.

Spot-check with Chrome devtools Lighthouse Accessibility on one representative page per domain.

---

## 19. Performance audit

```bash
npm run build                       # report bundle size
# Look at .next/analyze/ if a bundle analyzer is configured.

# Heuristic checks
grep -RIn "useEffect" app components --include="*.tsx" | wc -l
grep -RIn "useMemo\|useCallback" app components --include="*.tsx" | wc -l
```

Checks:

- No client component imports `pdf-lib` / `jspdf` at the top level of a page that isn't `app/invoices/[id]/print/` — they are heavy.
- Zustand selectors are scoped (`useStore(s => s.x)`), not whole-store subscriptions, on hot paths.
- Long lists virtualize or paginate above ~200 rows.
- Images use `next/image`.

---

## 20. Error handling and loading states audit

- Every page renders a loading state when its store has `loading: true` — not an empty list silently.
- Every async action surfaces errors via toast (`sonner` or whatever is wired) — never silent `catch (e) {}`.
- Auth redirect (`MainLayout` → `/login`) does not flash protected content first.
- API routes return JSON `{ error: string }` with the correct status, never raw HTML.

Grep helper:

```bash
grep -RIn "catch.*{[[:space:]]*}" app components lib --include="*.ts" --include="*.tsx"
grep -RIn "console.error" app components lib --include="*.ts" --include="*.tsx"
```

---

## 21. Testing and regression audit

There is no automated test suite. Validate via:

```bash
npm run typecheck
npm run lint
npm run build
```

Manual regression matrix (smoke test before any release):

- People list → open detail → edit field → confirm auto-save indicator.
- Projects list → create new project → assign a person → reopen.
- Organizations list → create → set country (SearchableSelect).
- Invoices: draft → issue → open PDF (German and English) → totals match.
- Invoices: storno an issued invoice → PDF downloadable from original → totals net to zero.
- Invoices: create revision from issued invoice → numbering `-rev` / `-rev-01`.
- Invoices: apply aconto → recipient invoice deducts → cannot apply same aconto twice.
- Calendar: open shared ICS URL → no auth required → contents correct.
- Admin: change a user role → reflected in `app_metadata`.
- Mobile viewport: every domain page renders without overflow.

---

## 22. Cleanup workflow

When the audit produces findings, **do not fix them inside the audit run**. Produce a punch list with categories:

| Severity | Meaning | Example |
|---|---|---|
| P0 | Data integrity or security risk | Duplicate invoice number, RLS off on `invoices` |
| P1 | Correctness / accounting | Storno not zeroing original |
| P2 | Build/typecheck/lint failure | `any` in service layer, broken build |
| P3 | Consistency / cleanup | Hardcoded German string, unused component |

Each finding gets: location (`file:line` or table name), evidence (query result or grep output), proposed fix (1–2 sentences), and a *separate* PR.

---

## 23. Subagent workflow

When the audit is large, parallelize via subagents. Spawn each agent with the explicit task below; collect their reports; do not let any agent write to the database.

| Subagent | Task |
|---|---|
| `codebase-inventory-agent` | Map routes, components, stores, services, Supabase usage, invoice logic, PDF logic, i18n files, and mobile components. Produce a single-page inventory. |
| `dead-code-cleanup-agent` | Find unused files, unused exports, duplicate components, stale mobile implementations, obsolete helpers, and unused npm dependencies. |
| `typescript-safety-agent` | Find `any`, unsafe casts, ignored TS errors, missing null checks, and inconsistent domain types. |
| `supabase-migration-agent` | Check migration list, drift between remote and `supabase/migrations/`, generated types freshness, and migration safety. **Read-only.** |
| `database-fault-audit-agent` | Run the §15 read-only SQL checks. Report orphans, duplicates, invalid statuses, broken invoice chains, broken aconto links, missing document language, inconsistent totals. **Never writes.** |
| `rls-security-agent` | Audit RLS, policies, service-role exposure, storage policies, ICS token endpoint, sensitive invoice/bank data access. |
| `invoice-accounting-agent` | Audit invoices, storno, revisions, acontos, PDFs, numbering, immutability, and correction chains in code + DB. |
| `ui-consistency-agent` | Audit buttons, fields, dialogs, tabs, badges, mobile density, responsive layout, and language consistency. |
| `performance-agent` | Audit bundle size, re-renders, heavy imports in wrong places, slow queries, indexes, and DB health reports. |
| `regression-agent` | Run `npm run typecheck`, `npm run lint`, `npm run build`, and the §21 manual matrix. |

Brief each agent with: (a) the relevant section of this file, (b) the specific files/tables in scope, (c) "report only, do not modify." Agents return findings; the main session compiles the punch list per §22.

---

## 24. Final release checklist

- [ ] `git status` reviewed; no unrelated changes staged.
- [ ] No secrets committed (`.env.local`, dumps, tokens in markdown).
- [ ] Database audit run, or intentionally skipped with a written reason.
- [ ] `npx supabase migration list` shows local == remote.
- [ ] `npx supabase db push --dry-run` shows no pending changes.
- [ ] RLS / security risks reviewed (§16).
- [ ] Invoice / aconto / storno / revision consistency checked (§12, §15.1–15.7, 15.16, 15.17).
- [ ] i18n consistency checked (§11) and `document_language` populated for issued invoices.
- [ ] Mobile representative screens checked (People, Projects, Organizations, Invoices, Calendar).
- [ ] Desktop representative screens checked (same domains).
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Any pending Supabase migrations reviewed by a human before push.
- [ ] Deployment only after every box above is ticked.
