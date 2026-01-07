# Box Score Finder

## Overview

A sports utility web application that generates box score links for professional sports games. Users enter a player name, team name, and game date, and the app generates direct URLs to box scores from official league sites (NBA, MLB, NFL, NHL, MLS) and third-party providers like ESPN and Basketball Reference. The application prioritizes speed, clarity, and ease of use with a function-first design approach.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom Replit plugins for development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Validation**: Zod schemas shared between client and server via `@shared/*` path alias

### Data Storage
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts` contains both database schemas and API validation schemas
- **Migrations**: Drizzle Kit manages database migrations in `./migrations` directory

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui component library
│   │   ├── pages/          # Route page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access and link generation logic
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client and server
│   └── schema.ts     # Zod schemas and TypeScript types
```

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets` → `./attached_assets`

### Build Process
- Development: `tsx server/index.ts` with Vite middleware for hot reloading
- Production: esbuild bundles server, Vite builds client to `dist/public`

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage for PostgreSQL

### Third-Party APIs (Link Generation)
The application generates URLs for external sports data providers:
- ESPN (espn.com)
- Basketball Reference (basketball-reference.com)
- Baseball Reference (baseball-reference.com)
- Official league sites (nba.com, mlb.com, nfl.com, nhl.com, mlssoccer.com)

### Key NPM Packages
- **UI Framework**: Radix UI primitives, class-variance-authority, clsx, tailwind-merge
- **Date Handling**: date-fns
- **Form Management**: react-hook-form, @hookform/resolvers
- **HTTP Client**: Fetch API via custom `apiRequest` utility
- **Validation**: Zod with drizzle-zod integration