# PricePulse

A full stack monorepo for tracking vehicle listings and prices. Users can search marketplaces, monitor price changes, set alerts, and view analytics through a web app, mobile app, and REST API.


## Features

- User authentication via Supabase Auth (web and mobile)
- Marketplace listing search (API integrates scraping and search endpoints)
- Vehicle and price history tracking
- Price alerts with optional natural-language parsing (Google Gemini)
- Analytics dashboard
- Notifications for triggered alerts
- Standalone scraper service for Sri Lankan marketplaces (ikman.lk, riyasewana.com)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Web | Next.js 14, TypeScript, Tailwind CSS, Supabase SSR |
| Mobile | React Native, Expo, TypeScript |
| API | NestJS, TypeScript, Supabase |
| Scraper | TypeScript, Playwright, Cheerio, Prisma |
| Shared | npm workspaces, `@vehicle-price-monitor/types` |
| Database | Supabase (PostgreSQL) |

## Project Structure

```
vehicle-price-monitor/
├── apps/
│   ├── api/          # NestJS REST API (port 3001)
│   ├── web/          # Next.js web app (port 3000)
│   ├── mobile/       # Expo React Native app
│   └── scraper/      # Listing scraper (optional, separate process)
├── packages/
│   └── types/        # Shared DTOs, entities, API types
├── supabase/
│   └── schema.sql    # Database schema for Supabase SQL Editor
├── .env.example      # Root environment template
└── package.json      # Workspace scripts
```

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- A Supabase project (URL, anon key, service role key)
- Optional: Google Gemini API key for natural-language alert parsing
- Optional: Playwright browsers if you run the scraper (`npx playwright install`)

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd vehicle-price-monitor
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the script in `supabase/schema.sql`.
3. Copy your project URL, anon key, and service role key for the env files below.

### 3. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

For the web app only, you can also use `apps/web/.env.local` with the variables from `apps/web/.env.example`.

| Variable | Used by | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | API | Supabase project URL |
| `SUPABASE_ANON_KEY` | API | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Service role key (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Web | Same URL, exposed to the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Same anon key for the browser |
| `NEXT_PUBLIC_API_URL` | Web | API base URL (default `http://localhost:3001`) |
| `NEXT_PUBLIC_APP_NAME` | Web | Display name in the UI |
| `EXPO_PUBLIC_API_URL` | Mobile | API URL reachable from the device (see mobile notes) |
| `GEMINI_API_KEY` | API | Optional; powers NLP alert parsing |
| `PORT` / `API_PORT` | API | API listen port (default 3001) |

Scraper-specific variables are documented in `apps/scraper/.env.example` (database URL, marketplace URLs, page limits).

### 4. Build shared types

```bash
npm run build:types
```

### 5. Run in development

Start the API and web app together:

```bash
npm run dev
```

Or run each app separately:

```bash
npm run dev:api      # http://localhost:3001/api/v1
npm run dev:web      # http://localhost:3000
npm run dev:mobile   # Expo dev server
```

Run the scraper (from `apps/scraper` after configuring `.env`):

```bash
cd apps/scraper
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and web in parallel |
| `npm run dev:web` | Next.js dev server on port 3000 |
| `npm run dev:api` | NestJS in watch mode on port 3001 |
| `npm run dev:mobile` | Expo dev server |
| `npm run dev:mobile:tunnel` | Expo with tunnel (useful on restricted Wi-Fi) |
| `npm run build` | Build types, web, and API |
| `npm run build:types` | Compile shared types package |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run tests in all workspaces |
| `npm run clean` | Remove workspace `node_modules` |
| `npm run clean:dist` | Remove build output (`.next`, `dist`) |

## API Overview

Base path: `http://localhost:3001/api/v1`

| Module | Purpose |
|--------|---------|
| `auth` | Login, register, session (Supabase-backed) |
| `users` | Profile management |
| `vehicles` | Tracked vehicles |
| `prices` | Price history and stats |
| `alerts` | Alert rules and notifications |
| `listings` | Marketplace search and listing details |
| `analytics` | Aggregated metrics |

Shared request/response types live in `packages/types` and are imported as:

```typescript
import type { Vehicle, CreateAlertDto } from '@vehicle-price-monitor/types';
```

## Web App

- App Router with route groups: `(auth)` for login/register, `(dashboard)` for protected pages
- Supabase middleware handles session refresh
- Dashboard areas include search, analytics, alerts, live alerts, and notifications

## Mobile App

- Expo Router with auth flow and tab navigation
- Uses the same API and Supabase auth patterns as the web app

When testing on a physical device, do not set `EXPO_PUBLIC_API_URL` to `localhost`. Use your computer's LAN IP (for example `http://192.168.1.10:3001`) or run `npm run dev:mobile:tunnel` if Metro cannot connect on the local network. See `apps/mobile/.env.example` for details.

## Architecture Notes

- **Monorepo**: npm workspaces link `apps/*` and `packages/*`.
- **Types package**: Build `@vehicle-price-monitor/types` before building apps that depend on it.
- **API data layer**: NestJS services use Supabase client (`apps/api/src/common/supabase`), not a local Prisma instance for the main API.
- **Scraper**: Optional service with its own Prisma schema; can populate or support listing data separately from the API.

## Troubleshooting

- **Web cannot reach API**: Confirm `NEXT_PUBLIC_API_URL` matches where the API is running.
- **Mobile auth or API fails on device**: Use LAN IP or Expo tunnel; ensure Windows Firewall allows Node on private networks (ports 3001, 8081).
- **Gemini alerts unavailable**: Set `GEMINI_API_KEY`; the API still works without it, but NLP parsing is disabled.
- **Database errors**: Re-run `supabase/schema.sql` and verify RLS policies match your auth setup.

## License

MIT
