

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_people_for_project"("project_id" "uuid") RETURNS TABLE("person_id" "uuid", "person_data" "jsonb", "assignment_data" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as person_id,
        row_to_json(p.*)::jsonb as person_data,
        row_to_json(pa.*)::jsonb as assignment_data
    FROM people p
    INNER JOIN project_assignments pa ON pa.person_id = p.id
    WHERE pa.project_id = get_people_for_project.project_id
    ORDER BY p.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_people_for_project"("project_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_organization_id" "uuid",
    "status" "text" DEFAULT 'ANFRAGE'::"text",
    "creation_date" timestamp with time zone DEFAULT "now"(),
    "inquiry_country" "text",
    "shooting_location" "text",
    "description" "text",
    "assigned_people" "uuid"[] DEFAULT '{}'::"uuid"[],
    "organization_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "budget" numeric(15,2),
    "currency" "text" DEFAULT 'EUR'::"text",
    "start_date" "date",
    "end_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "user_id" "uuid",
    CONSTRAINT "projects_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['INQUIRY'::"text", 'BUDGET'::"text", 'PRODUCTION'::"text", 'COMPLETED'::"text", 'CANCELLED'::"text", 'HOLD'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_projects_for_organization"("org_id" "uuid") RETURNS SETOF "public"."projects"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.*
    FROM projects p
    WHERE p.client_organization_id = get_projects_for_organization.org_id
    OR get_projects_for_organization.org_id = ANY(p.organization_ids)
    ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_projects_for_organization"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_projects_for_person"("person_id" "uuid") RETURNS SETOF "public"."projects"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.*
    FROM projects p
    INNER JOIN project_assignments pa ON pa.project_id = p.id
    WHERE pa.person_id = get_projects_for_person.person_id
    ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_projects_for_person"("person_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user has admin role in user_profiles
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.last_modified = CURRENT_TIMESTAMP;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_calendar_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_owns_record"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT user_id = auth.uid()
$$;


ALTER FUNCTION "public"."user_owns_record"("user_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "calendar_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_all_day" boolean DEFAULT false NOT NULL,
    "location" character varying(255),
    "notes" "text",
    "attendees" "text"[],
    "status" character varying(20) DEFAULT 'confirmed'::character varying NOT NULL,
    "recurrence_rule" "jsonb",
    "last_modified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendars" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid",
    "name" "text" NOT NULL,
    "tz_id" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "size" bigint NOT NULL,
    "upload_date" timestamp with time zone DEFAULT "now"(),
    "file_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "calendar_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "start_ts" timestamp with time zone NOT NULL,
    "end_ts" timestamp with time zone NOT NULL,
    "is_all_day" boolean DEFAULT false NOT NULL,
    "rrule" "text",
    "location" "text",
    "organizer_id" "uuid",
    "attendees" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_aconto_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "source_invoice_id" "uuid",
    "source_invoice_number" "text" NOT NULL,
    "source_invoice_date" "date",
    "label" "text" DEFAULT 'Aconto'::"text" NOT NULL,
    "net_amount" numeric DEFAULT 0 NOT NULL,
    "tax_amount" numeric,
    "gross_amount" numeric DEFAULT 0 NOT NULL,
    "applied_amount" numeric DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."invoice_aconto_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invoice_id" "uuid" NOT NULL,
    "label" "text",
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text"
);


ALTER TABLE "public"."invoice_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "invoice_id" "uuid" NOT NULL,
    "related_invoice_id" "uuid",
    "event_type" "text" NOT NULL,
    "reason" "text",
    "payload" "jsonb",
    CONSTRAINT "invoice_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['invoice_storno_created'::"text", 'invoice_revision_created'::"text", 'invoice_cancelled'::"text", 'invoice_replaced_by_revision'::"text"])))
);


ALTER TABLE "public"."invoice_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "sub_description" "text",
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "item_type" "text" DEFAULT 'service'::"text" NOT NULL,
    "source_invoice_id" "uuid",
    CONSTRAINT "invoice_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['service'::"text", 'expense'::"text", 'aconto_deduction'::"text", 'correction_reversal'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "invoice_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "project_id" "uuid",
    "recipient_name" "text",
    "recipient_contact" "text",
    "recipient_street" "text",
    "recipient_zip" "text",
    "recipient_city" "text",
    "recipient_country" "text",
    "sender_name" "text",
    "sender_address_line" "text",
    "sender_phone" "text",
    "sender_email" "text",
    "date" "date",
    "due_date" "date",
    "service_period_start" "date",
    "service_period_end" "date",
    "reference" "text",
    "uid_recipient" "text",
    "greeting" "text",
    "intro" "text",
    "footer_notes" "text",
    "bank_recipient" "text",
    "iban" "text",
    "bic" "text",
    "total" numeric(12,2),
    "is_aconto" boolean DEFAULT false NOT NULL,
    "aconto_invoice_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "document_type" "text" DEFAULT 'invoice'::"text" NOT NULL,
    "original_invoice_id" "uuid",
    "corrects_invoice_id" "uuid",
    "storno_invoice_id" "uuid",
    "revision_of_invoice_id" "uuid",
    "replaced_by_invoice_id" "uuid",
    "revision_sequence" integer,
    "storno_reason" "text",
    "storno_date" "date",
    "pdf_document_label" "text",
    CONSTRAINT "invoices_document_type_check" CHECK (("document_type" = ANY (ARRAY['invoice'::"text", 'storno_invoice'::"text", 'revision_invoice'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "contact_email" "text",
    "contact_phone" "text",
    "address" "jsonb",
    "notes" "text",
    "jobs" "jsonb" DEFAULT '[]'::"jsonb",
    "financial_details" "jsonb",
    "street" "text",
    "street2" "text",
    "zip" "text",
    "city" "text",
    "country" "text",
    "name_invoice" "text",
    "street_invoice" "text",
    "street2_invoice" "text",
    "zip_invoice" "text",
    "city_invoice" "text",
    "country_invoice" "text",
    "documents" "uuid"[] DEFAULT '{}'::"uuid"[],
    "user_id" "uuid",
    "website" "text",
    CONSTRAINT "organizations_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."street" IS 'Main address street (line 1)';



COMMENT ON COLUMN "public"."organizations"."street2" IS 'Main address street (line 2, optional)';



COMMENT ON COLUMN "public"."organizations"."zip" IS 'Main address postal code';



COMMENT ON COLUMN "public"."organizations"."city" IS 'Main address city';



COMMENT ON COLUMN "public"."organizations"."country" IS 'Main address country';



COMMENT ON COLUMN "public"."organizations"."name_invoice" IS 'Invoice address recipient/company name';



COMMENT ON COLUMN "public"."organizations"."street_invoice" IS 'Invoice address street (line 1)';



COMMENT ON COLUMN "public"."organizations"."street2_invoice" IS 'Invoice address street (line 2, optional)';



COMMENT ON COLUMN "public"."organizations"."zip_invoice" IS 'Invoice address postal code';



COMMENT ON COLUMN "public"."organizations"."city_invoice" IS 'Invoice address city';



COMMENT ON COLUMN "public"."organizations"."country_invoice" IS 'Invoice address country';



CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "profession" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "gender" "text",
    "mobile_phone" "text",
    "work_phone" "text",
    "website" "text",
    "address" "jsonb",
    "jobs" "jsonb" DEFAULT '[]'::"jsonb",
    "languages" "jsonb" DEFAULT '[]'::"jsonb",
    "organization_id" "uuid",
    "created_by" "uuid",
    "financial_details" "jsonb",
    "documents" "uuid"[] DEFAULT '{}'::"uuid"[],
    "user_id" "uuid",
    CONSTRAINT "people_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"]))),
    CONSTRAINT "people_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."people" OWNER TO "postgres";


COMMENT ON COLUMN "public"."people"."organization_id" IS 'Reference to organization this person belongs to';



CREATE TABLE IF NOT EXISTS "public"."project_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "person_id" "uuid",
    "role" "text",
    "department" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "availability" "text" DEFAULT 'Anfragen'::"text" NOT NULL,
    "daily_pay" numeric(10,2),
    "currency" "text" DEFAULT 'EUR'::"text",
    "notes" "text",
    "user_id" "uuid",
    "organization_id" "uuid",
    CONSTRAINT "chk_assignment_has_entity" CHECK ((("person_id" IS NOT NULL) OR ("organization_id" IS NOT NULL))),
    CONSTRAINT "project_assignments_availability_check" CHECK (("availability" = ANY (ARRAY['To Inquire'::"text", 'Inquired'::"text", 'Available'::"text", 'Not Available'::"text", '1st Option'::"text", '2nd Option'::"text", 'Booked'::"text", 'Cancelled'::"text", 'No Response'::"text"]))),
    CONSTRAINT "project_assignments_currency_check" CHECK (("currency" = ANY (ARRAY['EUR'::"text", 'USD'::"text", 'GBP'::"text"])))
);


ALTER TABLE "public"."project_assignments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."project_assignments"."role" IS 'Specific position/role on THIS project (separate from person''s general jobs/skills)';



CREATE TABLE IF NOT EXISTS "public"."project_calendars" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "color" character varying(7) DEFAULT '#007AFF'::character varying NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "is_shared" boolean DEFAULT false NOT NULL,
    "last_modified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "user_id" "uuid",
    "share_token" "uuid" DEFAULT "gen_random_uuid"(),
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."project_calendars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendars"
    ADD CONSTRAINT "calendars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_aconto_applications"
    ADD CONSTRAINT "invoice_aconto_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_attachments"
    ADD CONSTRAINT "invoice_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_events"
    ADD CONSTRAINT "invoice_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_types"
    ADD CONSTRAINT "job_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."job_types"
    ADD CONSTRAINT "job_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_project_id_person_id_key" UNIQUE ("project_id", "person_id");



ALTER TABLE ONLY "public"."project_calendars"
    ADD CONSTRAINT "project_calendars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_calendars"
    ADD CONSTRAINT "project_calendars_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_project_number_key" UNIQUE ("project_number");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assignments_availability" ON "public"."project_assignments" USING "btree" ("availability");



CREATE INDEX "idx_assignments_department" ON "public"."project_assignments" USING "btree" ("department");



CREATE INDEX "idx_calendar_events_calendar_id" ON "public"."calendar_events" USING "btree" ("calendar_id");



CREATE INDEX "idx_calendar_events_end_date" ON "public"."calendar_events" USING "btree" ("end_date");



CREATE INDEX "idx_calendar_events_start_date" ON "public"."calendar_events" USING "btree" ("start_date");



CREATE INDEX "idx_calendar_events_user_id" ON "public"."calendar_events" USING "btree" ("user_id");



CREATE INDEX "idx_calendars_project" ON "public"."calendars" USING "btree" ("project_id");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_documents_upload_date" ON "public"."documents" USING "btree" ("upload_date");



CREATE INDEX "idx_documents_user_id" ON "public"."documents" USING "btree" ("user_id");



CREATE INDEX "idx_events_calendar_start" ON "public"."events" USING "btree" ("calendar_id", "start_ts");



CREATE INDEX "idx_invoice_aconto_applications_invoice_id" ON "public"."invoice_aconto_applications" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_aconto_applications_source_invoice_id" ON "public"."invoice_aconto_applications" USING "btree" ("source_invoice_id");



CREATE INDEX "idx_invoice_events_event_type" ON "public"."invoice_events" USING "btree" ("event_type");



CREATE INDEX "idx_invoice_events_invoice_id" ON "public"."invoice_events" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_items_item_type" ON "public"."invoice_items" USING "btree" ("item_type");



CREATE INDEX "idx_invoice_items_source_invoice_id" ON "public"."invoice_items" USING "btree" ("source_invoice_id");



CREATE INDEX "idx_invoices_corrects_invoice_id" ON "public"."invoices" USING "btree" ("corrects_invoice_id");



CREATE INDEX "idx_invoices_document_type" ON "public"."invoices" USING "btree" ("document_type");



CREATE INDEX "idx_invoices_original_invoice_id" ON "public"."invoices" USING "btree" ("original_invoice_id");



CREATE INDEX "idx_invoices_revision_of_invoice_id" ON "public"."invoices" USING "btree" ("revision_of_invoice_id");



CREATE INDEX "idx_organizations_address_gin" ON "public"."organizations" USING "gin" ("address");



CREATE INDEX "idx_organizations_contact_email" ON "public"."organizations" USING "btree" ("contact_email");



CREATE INDEX "idx_organizations_created_by" ON "public"."organizations" USING "btree" ("created_by");



CREATE INDEX "idx_organizations_jobs_gin" ON "public"."organizations" USING "gin" ("jobs");



CREATE INDEX "idx_organizations_name" ON "public"."organizations" USING "btree" ("name");



CREATE INDEX "idx_organizations_user_id" ON "public"."organizations" USING "btree" ("user_id");



CREATE INDEX "idx_people_address_gin" ON "public"."people" USING "gin" ("address");



CREATE INDEX "idx_people_created_at" ON "public"."people" USING "btree" ("created_at");



CREATE INDEX "idx_people_created_by" ON "public"."people" USING "btree" ("created_by");



CREATE INDEX "idx_people_email" ON "public"."people" USING "btree" ("email");



CREATE INDEX "idx_people_jobs_gin" ON "public"."people" USING "gin" ("jobs");



CREATE INDEX "idx_people_languages_gin" ON "public"."people" USING "gin" ("languages");



CREATE INDEX "idx_people_name" ON "public"."people" USING "btree" ("name");



CREATE INDEX "idx_people_organization_id" ON "public"."people" USING "btree" ("organization_id");



CREATE INDEX "idx_people_user_id" ON "public"."people" USING "btree" ("user_id");



CREATE INDEX "idx_project_assignments_organization_id" ON "public"."project_assignments" USING "btree" ("organization_id");



CREATE INDEX "idx_project_assignments_person_id" ON "public"."project_assignments" USING "btree" ("person_id");



CREATE INDEX "idx_project_assignments_person_project" ON "public"."project_assignments" USING "btree" ("person_id", "project_id");



CREATE INDEX "idx_project_assignments_project_id" ON "public"."project_assignments" USING "btree" ("project_id");



CREATE INDEX "idx_project_assignments_user_id" ON "public"."project_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_project_calendars_project_id" ON "public"."project_calendars" USING "btree" ("project_id");



CREATE INDEX "idx_project_calendars_user_id" ON "public"."project_calendars" USING "btree" ("user_id");



CREATE INDEX "idx_projects_budget" ON "public"."projects" USING "btree" ("budget");



CREATE INDEX "idx_projects_client_organization_id" ON "public"."projects" USING "btree" ("client_organization_id");



CREATE INDEX "idx_projects_created_by" ON "public"."projects" USING "btree" ("created_by");



CREATE INDEX "idx_projects_creation_date" ON "public"."projects" USING "btree" ("creation_date");



CREATE INDEX "idx_projects_end_date" ON "public"."projects" USING "btree" ("end_date");



CREATE INDEX "idx_projects_name" ON "public"."projects" USING "btree" ("name");



CREATE INDEX "idx_projects_number" ON "public"."projects" USING "btree" ("project_number");



CREATE INDEX "idx_projects_organization_ids" ON "public"."projects" USING "gin" ("organization_ids");



CREATE INDEX "idx_projects_start_date" ON "public"."projects" USING "btree" ("start_date");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE UNIQUE INDEX "uq_invoice_aconto_applications_invoice_source" ON "public"."invoice_aconto_applications" USING "btree" ("invoice_id", "source_invoice_id") WHERE ("source_invoice_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoices_updated_at"();



CREATE OR REPLACE TRIGGER "update_assignments_updated_at" BEFORE UPDATE ON "public"."project_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_event_timestamps" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_calendar_timestamps"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_people_updated_at" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_assignments_updated_at" BEFORE UPDATE ON "public"."project_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_calendar_timestamps" BEFORE UPDATE ON "public"."project_calendars" FOR EACH ROW EXECUTE FUNCTION "public"."update_calendar_timestamps"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "public"."project_calendars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendars"
    ADD CONSTRAINT "calendars_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "fk_organization" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_aconto_applications"
    ADD CONSTRAINT "invoice_aconto_applications_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_aconto_applications"
    ADD CONSTRAINT "invoice_aconto_applications_source_invoice_id_fkey" FOREIGN KEY ("source_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_attachments"
    ADD CONSTRAINT "invoice_attachments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_events"
    ADD CONSTRAINT "invoice_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_events"
    ADD CONSTRAINT "invoice_events_related_invoice_id_fkey" FOREIGN KEY ("related_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_events"
    ADD CONSTRAINT "invoice_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_source_invoice_id_fkey" FOREIGN KEY ("source_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_corrects_invoice_id_fkey" FOREIGN KEY ("corrects_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_original_invoice_id_fkey" FOREIGN KEY ("original_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_replaced_by_invoice_id_fkey" FOREIGN KEY ("replaced_by_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_revision_of_invoice_id_fkey" FOREIGN KEY ("revision_of_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_storno_invoice_id_fkey" FOREIGN KEY ("storno_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_calendars"
    ADD CONSTRAINT "project_calendars_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_calendars"
    ADD CONSTRAINT "project_calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_organization_id_fkey" FOREIGN KEY ("client_organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Calendars rw" ON "public"."calendars" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Events rw" ON "public"."events" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read events of shared calendar" ON "public"."calendar_events" FOR SELECT USING (("calendar_id" IN ( SELECT "project_calendars"."id"
   FROM "public"."project_calendars"
  WHERE ("project_calendars"."share_token" IS NOT NULL))));



CREATE POLICY "Public read shared calendar by token" ON "public"."project_calendars" FOR SELECT USING (("share_token" IS NOT NULL));



CREATE POLICY "Users can delete own aconto applications" ON "public"."invoice_aconto_applications" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_aconto_applications"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own invoice attachments" ON "public"."invoice_attachments" FOR DELETE USING (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own invoice items" ON "public"."invoice_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own invoices" ON "public"."invoices" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own aconto applications" ON "public"."invoice_aconto_applications" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_aconto_applications"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own invoice attachments" ON "public"."invoice_attachments" FOR INSERT WITH CHECK (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own invoice events" ON "public"."invoice_events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_events"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own invoice items" ON "public"."invoice_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own invoices" ON "public"."invoices" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own aconto applications" ON "public"."invoice_aconto_applications" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_aconto_applications"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own invoice items" ON "public"."invoice_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own invoices" ON "public"."invoices" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own aconto applications" ON "public"."invoice_aconto_applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_aconto_applications"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own invoice attachments" ON "public"."invoice_attachments" FOR SELECT USING (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own invoice events" ON "public"."invoice_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_events"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own invoice items" ON "public"."invoice_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."invoices"
  WHERE (("invoices"."id" = "invoice_items"."invoice_id") AND ("invoices"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own invoices" ON "public"."invoices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their calendar events" ON "public"."calendar_events" USING (("calendar_id" IN ( SELECT "pc"."id"
   FROM ("public"."project_calendars" "pc"
     JOIN "public"."projects" "p" ON (("p"."id" = "pc"."project_id")))
  WHERE ("p"."user_id" = "auth"."uid"())))) WITH CHECK (("calendar_id" IN ( SELECT "pc"."id"
   FROM ("public"."project_calendars" "pc"
     JOIN "public"."projects" "p" ON (("p"."id" = "pc"."project_id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users manage their project calendars" ON "public"."project_calendars" USING (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"())))) WITH CHECK (("project_id" IN ( SELECT "projects"."id"
   FROM "public"."projects"
  WHERE ("projects"."user_id" = "auth"."uid"()))));



CREATE POLICY "admin_delete_job_types" ON "public"."job_types" FOR DELETE TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_insert_job_types" ON "public"."job_types" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "admin_update_job_types" ON "public"."job_types" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "authenticated_read_job_types" ON "public"."job_types" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendars" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendars_delete" ON "public"."project_calendars" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "calendars_insert" ON "public"."project_calendars" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "calendars_select" ON "public"."project_calendars" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "calendars_update" ON "public"."project_calendars" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete" ON "public"."documents" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "documents_insert" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "documents_select" ON "public"."documents" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "documents_update" ON "public"."documents" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete" ON "public"."calendar_events" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "events_insert" ON "public"."calendar_events" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "events_select" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "events_update" ON "public"."calendar_events" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."invoice_aconto_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_delete" ON "public"."organizations" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "organizations_insert" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "organizations_select" ON "public"."organizations" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "organizations_update" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "people_delete" ON "public"."people" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "people_insert" ON "public"."people" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "people_select" ON "public"."people" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "people_update" ON "public"."people" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."project_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_assignments_delete" ON "public"."project_assignments" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "project_assignments_insert" ON "public"."project_assignments" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "project_assignments_select" ON "public"."project_assignments" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "project_assignments_update" ON "public"."project_assignments" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."project_calendars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_delete" ON "public"."projects" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "projects_insert" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "projects_select" ON "public"."projects" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "projects_update" ON "public"."projects" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"())) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_insert_own" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "user_profiles_select_own" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."organizations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."people";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_assignments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_people_for_project"("project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_people_for_project"("project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_people_for_project"("project_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_projects_for_organization"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_projects_for_organization"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_projects_for_organization"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_projects_for_person"("person_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_projects_for_person"("person_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_projects_for_person"("person_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calendar_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_calendar_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoices_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_owns_record"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_owns_record"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_owns_record"("user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."calendars" TO "anon";
GRANT ALL ON TABLE "public"."calendars" TO "authenticated";
GRANT ALL ON TABLE "public"."calendars" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_aconto_applications" TO "anon";
GRANT ALL ON TABLE "public"."invoice_aconto_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_aconto_applications" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_attachments" TO "anon";
GRANT ALL ON TABLE "public"."invoice_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_events" TO "anon";
GRANT ALL ON TABLE "public"."invoice_events" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_events" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."job_types" TO "anon";
GRANT ALL ON TABLE "public"."job_types" TO "authenticated";
GRANT ALL ON TABLE "public"."job_types" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."project_assignments" TO "anon";
GRANT ALL ON TABLE "public"."project_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."project_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."project_calendars" TO "anon";
GRANT ALL ON TABLE "public"."project_calendars" TO "authenticated";
GRANT ALL ON TABLE "public"."project_calendars" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























drop extension if exists "pg_net";


  create policy "Authenticated users can delete invoice attachments"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'invoice-attachments'::text));



  create policy "Authenticated users can read invoice attachments"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'invoice-attachments'::text));



  create policy "Authenticated users can upload invoice attachments"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'invoice-attachments'::text));



