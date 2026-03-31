# Supabase Changes Required — 2026-03-18

## 1. Add `website` column to `organizations` table

The `website` field exists in the app UI and TypeScript model but is missing from the DB schema.
Until this is added, website values entered by users will not be saved.

```sql
ALTER TABLE organizations ADD COLUMN website text;
```

After running this migration:
- Remove the `website` exclusion from `SupabaseService.addOrganization` and `SupabaseService.updateOrganization` in `lib/services/supabase-service.ts`
- Add `website` back to the `addOrganization` submit payload in `components/organizations/add-organization-dialog.tsx`

**This is also required for org logos to appear** — `OrgLogo` derives the domain from `website` (and falls back to the email domain). Without this column no logos will load for orgs that don't have a `contact_email` set.
