# CrewBooklet

Film production crew management — built with Next.js, Supabase, and TypeScript.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 4
- **UI**: shadcn/ui + Radix primitives
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **State**: Zustand
- **Deployment**: Vercel

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/mcerny12/crewbooklet.git
cd crewbooklet/crewbooklet-web
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Database

Run the SQL migration files in order in Supabase Dashboard → SQL Editor:

1. `migration-2026-03-19.sql`
2. `migration-attachments.sql`
3. `migration-calendar.sql`
4. `migration-invoices.sql`
5. `migration-roles.sql` — role-based access control

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev        # Dev server (Turbopack)
npm run build      # Production build
npm run typecheck  # TypeScript check (no emit)
npm run lint       # ESLint
npm start          # Start production server
```

## User roles

| Role | Can read | Can create/edit | Can delete | Admin panel |
|---|:---:|:---:|:---:|:---:|
| admin | ✓ | ✓ | ✓ | ✓ |
| user | ✓ | ✓ | ✓ | |
| viewer | ✓ | | | |

Roles are stored in `app_metadata.role` (service-role protected — users cannot self-promote).
The first admin must be set via Supabase Dashboard → SQL Editor or the admin API.

## Deployment (Vercel)

1. Import the repo in Vercel, set **Root Directory** to `crewbooklet-web`
2. Add all environment variables (Development / Preview / Production)
3. In Supabase → Authentication → URL Configuration:
   - **Site URL**: your Vercel URL
   - **Redirect URLs**: `https://your-app.vercel.app/**`
4. Add GitHub secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for CI builds

## Project structure

```
crewbooklet-web/
├── app/                  # Next.js App Router pages + API routes
│   ├── admin/            # User management (admin only)
│   ├── api/admin/users/  # Role management API
│   ├── api/calendar/     # Public ICS feed endpoint
│   ├── people/
│   ├── projects/
│   ├── organizations/
│   ├── invoices/
│   └── calendar/
├── components/
│   ├── layout/           # Sidebar, MainLayout
│   ├── people/
│   ├── projects/
│   ├── organizations/
│   ├── invoices/
│   ├── calendar/
│   ├── ui/               # Shared UI primitives
│   └── providers/
├── lib/
│   ├── hooks/            # usePermissions
│   ├── services/         # Supabase data layer
│   ├── stores/           # Zustand stores
│   ├── supabase/         # client / server / admin clients
│   └── types/            # TypeScript models and enums
└── migration-*.sql       # Database migration files
```
