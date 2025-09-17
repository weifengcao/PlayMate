# PlayMate

PlayMate helps nearby parents coordinate fun, safe playdates by matching their kids by age, interests, and availability. The app delivers a full-stack experience that blends a React front end, an Express/Node back end, and a PostgreSQL database.

## Features
- Email-and-password authentication with secure session cookies
- Kid profiles with ages and favourite activities
- Interactive map for choosing or updating a personal playdate location
- Friendship workflow (send requests, accept, ignore)
- Playmate discovery by filtering kids who share an activity
- Seed data for users, kids, and friendships so you can explore immediately
- Agent-powered orchestration with async task tracking, live updates, and feature-flagged recommendations
- Distributed queue with automatic retries and dead-letter handling for agent tasks

## Tech Stack
- React 18 + Vite
- TypeScript
- Emotion for styling
- Leaflet and react-leaflet for mapping
- Express, Sequelize, and PostgreSQL
- Nodemon for local development

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL running locally on `127.0.0.1:5432` with credentials `postgres / postgres`
  - Adjust `src/server/initSeq.ts` if you use different connection details.

### Installation
```bash
git clone <your-fork-or-repo-url>
cd PlayMate
npm install
```

### Database
- Ensure PostgreSQL is running and accessible with the credentials above.
- On first launch the app seeds starter data (users, kids, friendships) automatically.

### Development Server
```bash
npm start
```
- Runs the Express API and the Vite dev server on **http://localhost:8080** with hot reloading.
- Watch the terminal for “Listening on http://localhost:8080”.
- Real-time task updates stream over `/api/task-events` once you log in; the UI automatically consumes them.

### Production Build
```bash
npm run build
```
- Outputs an optimized client bundle using Vite.

## Sample Accounts
- jill / a
- brad / b
- cathy / c
- dilb / d

## Key API Routes
- `POST /auth/login` – authenticate and start a session
- `GET /api/kids/mykids` – current guardian’s kids
- `GET /api/playdate-point/coordinates` – fetch saved map coordinates
- `POST /api/playdate-point/coordinates` – update map coordinates
- `GET /api/task-events` – Server-Sent Events stream with orchestrator progress (auth required)
- `GET /api/friends/pending` – requests you sent
- `GET /api/friends/askingforme` – requests you received
- `POST /api/friends/ask` – send a friend request
- `POST /api/friends/setstate` – accept or ignore a request

## Project Structure
```
src/
  client/             # React app (components, hooks, CSS)
  server/
    routes/           # Express API routes
    middleware/       # Auth and request helpers
    models/           # Sequelize models and seed helpers
    vite-server.ts    # Express + Vite integration
index.html            # Vite entry template
```

## Troubleshooting
- **Blank map or missing tiles**: ensure Leaflet assets load and Postgres is running so user data can be fetched.
- **Login fails**: verify Postgres credentials and that seed users exist (`populateDatabase` runs on startup).
- **Port already in use**: stop other services on `8080` or update `src/server/vite-server.ts`.

## Contributing
1. Fork the repository and create a feature branch.
2. Follow the coding conventions (TypeScript, ESLint defaults).
3. Include clear commit messages and open a pull request describing your change.

Enjoy building playful experiences with PlayMate!
## Feature Flags
- `FEATURE_AVAILABILITY_AGENT` (default `true`) – enable availability planning suggestions after saving a playdate location.
- `FEATURE_KNOWLEDGE_AGENT` (default `true`) – surface local insight tips alongside location updates.

Set the variables before launching the server, e.g.
```bash
FEATURE_AVAILABILITY_AGENT=false FEATURE_KNOWLEDGE_AGENT=true npm start
```

## Configuration
- `JWT_SECRET` – secret for signing session tokens (defaults to the sample value in development).
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` – override PostgreSQL connection details.
- `AGENT_LOG_LEVEL` – adjust orchestrator logging (`debug`, `info`, `warn`, `error`).
- `FEATURE_AVAILABILITY_AGENT`, `FEATURE_KNOWLEDGE_AGENT` – enable/disable enrichment agents.

Example:
```bash
JWT_SECRET="super-secret" DB_HOST=localhost DB_PASSWORD=postgres AGENT_LOG_LEVEL=debug npm start
```

## Async Agent Workflow
- Tasks are persisted in PostgreSQL (`agent_tasks`) with retry metadata (`attempts`, `maxAttempts`, `nextRunAt`).
- A background worker polls the queue, applies exponential backoff, and moves exhausted jobs to a `dead-letter` state.
- SSE clients receive `task-update` events for every lifecycle change; polling remains as a fallback in the client API helper.
- Friend-ask and acceptance flows trigger follow-up recommendation tasks so guardians receive curated matchmaking suggestions via the same pipeline.

## Continuous Integration
- `npm run typecheck` runs a no-emit TypeScript pass.
- GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, type-checks, and builds every push/PR so agent regressions surface quickly.
