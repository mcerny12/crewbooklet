# CrewBooklet Web

A modern web application for managing film production crews and projects. Built with Next.js 14, TypeScript, Supabase, and shadcn/ui.

## Migration from Swift/macOS

This is a web version of the original macOS CrewBooklet application. The original Swift codebase has been backed up to [`../swift-macos-backup/`](../swift-macos-backup/).

## Features

- **People Management** - Track crew members with detailed profiles
- **Organization Management** - Manage production companies and agencies
- **Project Management** - Organize film/TV production projects
- **Authentication** - Secure login with Supabase Auth
- **Real-time Updates** - Live data synchronization
- **Advanced Search** - Multi-criteria search across all entities
- **Role-based Access** - Admin, User, and Viewer roles

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings under **Settings > API**.

### 3. Database Setup

Your Supabase database should already be set up if you were using the Swift version. If not, run the SQL migration scripts in the parent directory:

- `../supabase_complete_schema.sql` - Complete database schema
- `../database_migration.sql` - Additional migrations

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Sign In

Use your existing Supabase credentials to sign in. If you don't have an account, you'll need to create one through your Supabase dashboard.

## Project Structure

```
crewbooklet-web/
├── app/                      # Next.js app router pages
│   ├── login/               # Login page
│   ├── page.tsx            # Home page (People list)
│   └── layout.tsx          # Root layout
├── components/
│   ├── layout/             # Layout components
│   │   ├── sidebar.tsx    # Navigation sidebar
│   │   └── main-layout.tsx
│   ├── people/            # People-related components
│   │   ├── person-list-item.tsx
│   │   ├── add-person-dialog.tsx
│   │   └── person-detail-dialog.tsx
│   ├── providers/         # React context providers
│   │   └── auth-provider.tsx
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── services/         # API services
│   │   └── supabase-service.ts
│   ├── stores/          # Zustand state stores
│   │   ├── auth-store.ts
│   │   └── people-store.ts
│   ├── supabase/        # Supabase client
│   │   └── client.ts
│   └── types/           # TypeScript type definitions
│       └── models.ts
└── public/              # Static assets
```

## Key Differences from Swift Version

### Architecture
- **Swift MVVM** → **React Hooks + Zustand** for state management
- **SwiftUI Views** → **React Components** with shadcn/ui
- **Combine** → **React useEffect** for side effects
- **Swift Enums** → **TypeScript Enums** and const objects

### Data Models
All Swift data models have been translated to TypeScript interfaces in `lib/types/models.ts`:
- `Person` - Crew member model
- `Organization` - Production company model
- `Project` - Film/TV project model
- `ProjectAssignment` - Crew assignments
- Plus all supporting enums and types

### Database Interaction
- Swift's `SupabaseService` → TypeScript `SupabaseService` class
- Same database schema and RLS policies
- Real-time subscriptions supported

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Development Notes

### Adding New Features

1. **Data Models**: Add interfaces to `lib/types/models.ts`
2. **Services**: Add methods to `lib/services/supabase-service.ts`
3. **State**: Create stores in `lib/stores/`
4. **UI**: Build components in `components/`
5. **Pages**: Add routes in `app/`

### UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/). To add new components:

```bash
npx shadcn@latest add [component-name]
```

### Type Safety

All components are fully typed with TypeScript. The type system ensures data consistency between the frontend and Supabase database.

## Roadmap

- [x] People management (basic CRUD)
- [ ] Organizations management
- [ ] Projects management
- [ ] Project crew assignments
- [ ] Advanced search
- [ ] Calendar integration
- [ ] Document uploads
- [ ] Export functionality
- [ ] Multi-user collaboration features

## Migration Benefits

### Why Web?

1. **Cross-platform** - Works on Mac, Windows, Linux, tablets, mobile
2. **No installation** - Access from any browser
3. **Better AI assistance** - Faster development with modern web tooling
4. **Rich ecosystem** - Thousands of ready-to-use packages
5. **Easier collaboration** - Multiple users can work simultaneously
6. **Faster iteration** - Hot reload, instant deploys

### What Was Preserved

- ✅ All data models and business logic
- ✅ Database schema (Supabase)
- ✅ Authentication and RLS
- ✅ Core functionality (CRUD operations)
- ✅ Real-time synchronization
- ✅ UI/UX concepts

## Support

For issues or questions:
1. Check the original Swift documentation in `../swift-macos-backup/`
2. Review Supabase docs: https://supabase.com/docs
3. Next.js documentation: https://nextjs.org/docs

## License

Same as the original CrewBooklet macOS application.
