# SustainNova AI

AI-Powered Audit, Risk & Corrective Action Management Platform.

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB (Mongoose)
- **AI/ML:** LangChain.js + OpenAI
- **Queue:** BullMQ + Redis
- **Auth:** next-auth (Auth.js v5) + JWT

## Prerequisites

- **Node.js** >= 18
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0 tier)
- **Redis** — local instance or [Upstash](https://upstash.com/) (free tier)
- **OpenAI API Key** — from [platform.openai.com](https://platform.openai.com)

## Project Structure

```
sustainnova-ai/
├── packages/
│   ├── shared/          # Shared TypeScript types & interfaces
│   ├── server/          # Express backend (port 4000)
│   └── client/          # Next.js frontend (port 3000)
├── package.json         # Monorepo root (npm workspaces)
└── ARCHITECTURE.md      # Full system architecture document
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

**Backend** — copy the example and fill in your values:

```bash
cp packages/server/.env.example packages/server/.env
```

Edit `packages/server/.env`:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/sustainnova
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-a-64-char-random-string>
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGIN=http://localhost:3000
```

**Frontend** — copy the example and fill in your values:

```bash
cp packages/client/.env.example packages/client/.env.local
```

Edit `packages/client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-a-64-char-random-string>
AUTH_SECRET=<generate-a-64-char-random-string>
```

> **Tip:** Generate a random secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Build Shared Types

The shared package must be built before the server and client:

```bash
npm run build -w @sustainnova/shared
```

## Running in Development

Start the backend and frontend in **separate terminals**:

**Terminal 1 — Backend (port 4000):**

```bash
npm run dev:server
```

**Terminal 2 — Frontend (port 3000):**

```bash
npm run dev:client
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
# Build all packages (shared → server → client)
npm run build

# Start the backend
npm run start -w @sustainnova/server

# Start the frontend
npm run start -w @sustainnova/client
```

## API Endpoints

Base URL: `http://localhost:4000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account (with optional organization) |
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get current user (requires Bearer token) |
| GET | `/api/health` | Health check |

More endpoints will be added in subsequent phases.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev:server` | Start backend with hot reload |
| `npm run dev:client` | Start frontend with hot reload |
| `npm run build` | Build all packages for production |
| `npm run build:server` | Build backend only |
| `npm run build:client` | Build frontend only |
| `npm run build -w @sustainnova/shared` | Build shared types package |
| `npm run lint` | Run linter across all packages |
| `npm run clean` | Clean build artifacts |

## Troubleshooting

**`npm install` fails with peer dependency errors:**
The `.npmrc` file is pre-configured with `legacy-peer-deps=true`. If you still see issues, run:
```bash
npm install --legacy-peer-deps
```

**MongoDB connection fails:**
Make sure your `MONGODB_URI` is correct and that your IP is whitelisted in Atlas (or MongoDB is running locally on port 27017).

**Redis connection fails:**
The app will still start without Redis, but BullMQ job processing won't work until Phase 4+. For now, you can ignore Redis errors during auth testing.

**`AUTH_SECRET` error on frontend build:**
Make sure `packages/client/.env.local` exists and contains `AUTH_SECRET=...`. See step 2 above.
