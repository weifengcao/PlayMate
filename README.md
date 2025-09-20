# PlayMate

PlayMate helps nearby parents coordinate fun, safe playdates by matching their kids by age, interests, and availability. The app ships a full-stack experience that blends a React front end, an Express/Node back end, and a PostgreSQL database with an async agent orchestrator.

## Quick Start
1. Install prerequisites: Node.js 18+ and a local PostgreSQL instance reachable on `127.0.0.1:5432`.
2. Clone the repo and install dependencies:
   ```bash
   git clone <your-fork-or-repo-url>
   cd PlayMate
   npm install
   ```
3. Launch the development server (starts Express + Vite with hot reloading):
   ```bash
   npm start
   ```
4. Open http://localhost:8080 and sign in with one of the sample accounts (`jill / a`, `brad / b`, `cathy / c`, `dilb / d`).

## Features
- Email-and-password authentication with secure session cookies and JWT-based verification
- Kid profiles with ages and favourite activities, plus quick filters for discovering matches
- Interactive map for choosing or updating a personal playdate location
- Friendship workflow (send requests, accept, ignore) with background task orchestration
- Live task updates via Server‑Sent Events so recommendations and availability planning stream in without refreshes
- Agent-powered recommendations backed by a distributed queue with automatic retries and dead-letter handling
- Activity leaderboard and tailored map suggestions to surface new playdate ideas
- Seed data for users, kids, friendships, and playdate sessions so you can explore immediately

## Scripts & Tooling
- `npm start` – runs Nodemon, the Express API, the orchestrator worker, and the Vite dev server on http://localhost:8080
- `npm run build` – outputs an optimized production client bundle via Vite
- `npm run typecheck` – executes a no-emit TypeScript pass across server and client

## Database & Seed Data
- On first launch the app seeds starter users, kids, and friendships automatically (`src/server/initData.ts`).
- Additional CSV files live in `src/server/data_to_import/` for analysts or manual imports.
- `src/server/models/InitData.ts` contains a `populatePlaydateSessions()` helper that can create `imported_kids` and `imported_playdate_sessions` tables for a data analyst exercise. Invoke it manually if you need that dataset; query the tables directly in PostgreSQL.

## Configuration
Environment variables customise PlayMate without changing code. Defaults support local development.

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | Enables production cookie settings | – |
| `JWT_SECRET` | Session token signing secret | `abcdef0123456789` |
| `DATABASE_URL` | Optional full Postgres connection string | – |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Individual Postgres connection overrides | `127.0.0.1`, `5432`, `postgres`, `postgres`, `postgres` |
| `DB_SSL` | Enable SSL for Postgres connections | `false` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins for the API | `http://localhost:3000,http://localhost:5173` |
| `ALLOWED_HOSTS` | Comma-separated list of hosts Vite should permit for HMR | – |
| `AGENT_LOG_LEVEL` | Orchestrator logging noise (`debug`, `info`, `warn`, `error`) | `info` |
| `FEATURE_AVAILABILITY_AGENT` | Enable availability planning suggestions | `true` |
| `FEATURE_KNOWLEDGE_AGENT` | Surface local insight tips alongside location updates | `true` |

Set `NODE_ENV=production` in any hosted deployment so session cookies are emitted with `Secure` and `SameSite=None`. Without it, cross-domain logins from Vercel will fail.

Set variables inline when starting the server, e.g.
```bash
FEATURE_AVAILABILITY_AGENT=false CORS_ORIGINS="http://localhost:8080" npm start
```

## Key API Routes
- `POST /auth/login` – authenticate and start a session
- `GET /api/kids/mykids` – current guardian’s kids
- `GET /api/playdate-point/coordinates` – fetch saved map coordinates
- `POST /api/playdate-point/coordinates` – update map coordinates
- `GET /api/task-events` – SSE stream with orchestrator progress (auth required)
- `GET /api/friends/pending` – requests you sent
- `GET /api/friends/askingforme` – requests you received
- `POST /api/friends/ask` – send a friend request
- `POST /api/friends/setstate` – accept or ignore a request
- `GET /api/recommendations` – agent-curated friend and activity suggestions

## Project Structure
```
src/
  client/             # React app (components, hooks, CSS)
  server/
    agents/           # Agent tools and task orchestration
    config/           # Environment parsing & feature flags
    middleware/       # Auth helpers
    models/           # Sequelize models & seed helpers
    orchestrator/     # Background worker + SSE wiring
    routes/           # Express API routes
    vite-server.ts    # Express + Vite integration entry point
index.html            # Vite entry template
```

## Troubleshooting
- **Blank map or missing tiles**: ensure Leaflet static assets load and Postgres is reachable so user data can be fetched.
- **Login fails**: verify Postgres credentials and that seed users exist (`populateDatabase` runs on startup).
- **Port already in use**: stop other services on `8080` or update `src/server/vite-server.ts`.
- **Origin not allowed**: adjust `CORS_ORIGINS` and `ALLOWED_HOSTS` if you expose the dev server through a tunnel.

## Deployment (Render + Vercel + Neon)
### 1. Provision Neon PostgreSQL
- Create a new Neon project and database branch. Copy the connection string (include `?sslmode=require`).
- Set the password on the generated database user if Neon prompts you; keep the user, password, and database name handy.
- Optional: create a separate shadow branch if you want an isolated staging environment—`sequelize.sync()` runs automatically on startup so no migration step is required.

### 2. Backend on Render (Express API + agents)
- Create a **Web Service** from this repository. Choose the Node runtime (18 or newer).
- Build command: `npm install` (Render runs this automatically). You can skip running `npm run build` here because the client is hosted separately.
- Start command: `npx ts-node --swc src/server/main.ts` (avoids dev-only Nodemon).
- Environment variables to add:
  - `DATABASE_URL` = Neon connection string (e.g. `postgresql://user:password@ep-example.neon.tech/neondb?sslmode=require`).
  - `JWT_SECRET` = long random string.
  - `CORS_ORIGINS` = include your Vercel domain(s), e.g. `https://your-app.vercel.app`.
  - `AGENT_LOG_LEVEL` = `info` (or `debug` for staging).
- Optional overrides: `FEATURE_AVAILABILITY_AGENT`, `FEATURE_KNOWLEDGE_AGENT`, `ALLOWED_HOSTS` if you plan to expose HMR during previews.
- Set `NODE_ENV=production` on Render (or whichever platform hosts the API) to keep cookies cross-site compatible.
- Render automatically sets `PORT`. The server listens via `vite-server.ts`, so no extra port configuration is needed.
- After the first deploy, confirm the service logs show tables being created, seed data inserted, and the agent worker starting without errors.

### 3. Frontend on Vercel (Vite bundle)
- Import the same repository in Vercel and select the **Vite** framework preset.
- Build command: `npm run build`; Output directory: `dist`.
- Environment variables:
  - `VITE_API_BASE_URL` = Render base URL (e.g. `https://playmate-api.onrender.com`).
  - Optional: replicate feature flag variables if you want the client to know which agents are active.
- Update `vercel.json` to rewrite API traffic to your Render domain. Replace the placeholder `https://playmate-f64o.onrender.com` with your Render service URL so `/api/*` and `/auth/*` proxy correctly.
- Trigger a deploy; Vercel serves the static `dist` assets while proxying API requests to Render, keeping cookies scoped to the same origin.

### 4. Post-deploy checks
- Visit the Vercel URL, sign in with a seed account, and confirm cookies persist across requests (no cross-origin warnings).
- Open the browser Network tab and verify SSE connections to `/api/task-events` stay open; if blocked, double-check `CORS_ORIGINS` on Render.
- Review Render logs for agent task execution; adjust `AGENT_LOG_LEVEL` to `debug` if you need deeper diagnostics in staging.

## Further Reading
- [docs/testing.md](docs/testing.md) – local checks and CI expectations
- [docs/agent-deployment.md](docs/agent-deployment.md) – orchestrator deployment notes and observability tips
- [src/server/config/featureFlags.ts](src/server/config/featureFlags.ts) – feature flag defaults used by the agents

## Contributing
1. Fork the repository and create a feature branch.
2. Follow the coding conventions (TypeScript, ESLint defaults).
3. Include clear commit messages and open a pull request describing your change.

Enjoy building playful experiences with PlayMate!
