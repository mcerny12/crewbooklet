-- Migration: org_hierarchy
-- Adds organizational hierarchy support (mother / subsidiary) to organizations.
-- Existing rows default to 'standalone'. Fully reversible — see DOWN section below.

-- ── UP ──────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."org_role" AS ENUM ('standalone', 'mother', 'subsidiary');

ALTER TABLE "public"."organizations"
  ADD COLUMN "org_role" "public"."org_role" NOT NULL DEFAULT 'standalone',
  ADD COLUMN "parent_organization_id" uuid
    REFERENCES "public"."organizations"("id") ON DELETE SET NULL;

-- DB-level: an organization cannot reference itself as its own parent.
-- (Circular reference across orgs is prevented at the application layer.)
ALTER TABLE "public"."organizations"
  ADD CONSTRAINT "organizations_no_self_parent"
    CHECK ("parent_organization_id" IS NULL OR "parent_organization_id" <> "id");

-- DB-level: parent_organization_id must be NULL for non-subsidiaries and
-- NOT NULL for subsidiaries. Application layer enforces this before writing;
-- this constraint catches any bypass attempts.
ALTER TABLE "public"."organizations"
  ADD CONSTRAINT "organizations_subsidiary_parent_coherence"
    CHECK (
      ("org_role" = 'subsidiary' AND "parent_organization_id" IS NOT NULL) OR
      ("org_role" <> 'subsidiary' AND "parent_organization_id" IS NULL)
    );

-- ── DOWN (run manually to reverse) ──────────────────────────────────────────
-- ALTER TABLE public.organizations DROP CONSTRAINT organizations_subsidiary_parent_coherence;
-- ALTER TABLE public.organizations DROP CONSTRAINT organizations_no_self_parent;
-- ALTER TABLE public.organizations DROP COLUMN parent_organization_id;
-- ALTER TABLE public.organizations DROP COLUMN org_role;
-- DROP TYPE public.org_role;
