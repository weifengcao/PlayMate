# Agent Workflow Deployment Notes

## Environment
Set the following environment variables before launching the server:

| Variable | Purpose | Default |
| --- | --- | --- |
| `JWT_SECRET` | Session token signing secret | `abcdef0123456789` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection | `127.0.0.1`, `5432`, `postgres`, `postgres`, `postgres` |
| `FEATURE_AVAILABILITY_AGENT` | Toggle availability planner | `true` |
| `FEATURE_KNOWLEDGE_AGENT` | Toggle local insight agent | `true` |
| `AGENT_LOG_LEVEL` | JSON log verbosity (`debug` → `error`) | `info` |

## Observability
- Agent lifecycle logs emit as JSON via `logger` (`src/server/utils/logger.ts`).
- SSE connections are logged when they open/close (`/api/task-events`).
- Task submissions/completions/failures log with task id and type.
- Distributed worker claims pending tasks using database row locks, retries with exponential backoff, and moves exhausted jobs to `dead-letter` status.

Forward logs to your platform of choice (Datadog, ELK, etc.) by shipping stdout.

## Runtime Checklist
1. Confirm PostgreSQL schema includes `agent_tasks` (created automatically by Sequelize sync).
2. Start the server: `AGENT_LOG_LEVEL=debug npm start` (adjust env vars as needed). The worker starts automatically.
3. Tail logs for task lifecycle events to verify orchestrator activity and retry behaviour.
4. Validate the SSE stream by hitting `/api/task-events` with `curl` once authenticated (or monitor browser dev tools).
5. Use `npm run build` for production bundles and serve the `dist` artifacts behind your preferred web server or CDN.

## Failure Handling
- Tasks that exhaust retries emit `Task moved to dead-letter` logs; monitor these entries and surface them in ops dashboards.
- Subscribe to `agentOrchestrator.onUpdate` to persist failed/dead-letter tasks for manual review or automated requeueing utilities.
- Increase `AGENT_LOG_LEVEL` noise (`debug`) in staging environments to capture detailed payloads while developing new agents.
