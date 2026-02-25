# Vehicle Price Monitor

A full-stack monorepo application for tracking vehicle listings and prices.

## Tech Stack

- **Web**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Mobile**: React Native with Expo (TypeScript)
- **API**: NestJS (TypeScript)
- **Monorepo**: npm workspaces
- **Shared Types**: TypeScript interfaces and DTOs

## Project Structure

```
vehicle-price-monitor/
├── apps/
│   ├── web/          # Next.js web application
│   ├── mobile/       # Expo React Native app
│   └── api/          # NestJS backend
├── packages/
│   └── types/        # Shared TypeScript types
├── package.json      # Root workspace config
└── tsconfig.base.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for the API)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd vehicle-price-monitor

# Install all dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Run web + API together
npm run dev

# Or run individually:
npm run dev:web      # Next.js on http://localhost:3000
npm run dev:api      # NestJS on http://localhost:3001
npm run dev:mobile   # Expo dev server
```

### Build

```bash
# Build all packages (types first, then apps)
npm run build

# Build individually
npm run build:types
npm run build:web
npm run build:api
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web and API in dev mode |
| `npm run dev:web` | Start Next.js dev server |
| `npm run dev:api` | Start NestJS in watch mode |
| `npm run dev:mobile` | Start Expo dev server |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run tests in all workspaces |
| `npm run clean` | Remove all node_modules |

## Architecture

### Shared Types (`packages/types`)

All DTOs, interfaces, and enums are defined once and imported by all apps:

```typescript
import type { Vehicle, CreateVehicleDto } from '@vehicle-price-monitor/types';
```

### API Structure (NestJS)

Feature-based modular architecture:

- `modules/auth` - Authentication (JWT)
- `modules/users` - User management
- `modules/vehicles` - Vehicle listings
- `modules/prices` - Price tracking
- `modules/alerts` - Price alerts

### Web Structure (Next.js)

App Router with route groups:

- `(auth)` - Login, Register pages
- `(dashboard)` - Protected routes (vehicles, alerts, prices)

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
