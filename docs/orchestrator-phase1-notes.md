# Agent Orchestrator – Progress Tracker

## Delivered (Phases 1–5)
- **Durable orchestration:** `AgentOrchestrator` now persists task state in the `agent_tasks` table, associates tasks with an owner, and still emits lifecycle updates for future SSE/WebSocket hooks.
- **Domain tools:** Friend and location business logic lives in `src/server/agents/tools`, providing reusable “tool” interfaces for agents.
- **Agent handlers:** Friend request, friendship state, and playdate location operations execute via orchestrator handlers (`friend.ask`, `friend.setState`, `location.playdate.update`).
- **Secured task endpoints:** `/api/tasks` requires authentication and enforces owner checks before returning status payloads.
- **Route refactor:** `/api/friends/ask`, `/api/friends/setstate`, and `/api/playdate-point/coordinates` submit work to the orchestrator and return `202 Accepted` with a task id.
- **Client integration:** The React API layer now submits async tasks, polls `/api/tasks/:id`, and surfaces results back to calling components.
- **Realtime streaming:** `/api/task-events` streams agent progress via Server-Sent Events; the client subscribes and falls back to polling when needed.
- **Feature-flagged agents:** Availability planning and local insight agents engage when environment toggles are enabled, returning richer payloads on location updates.
- **Distributed queue:** Tasks are stored in PostgreSQL, claimed via row-level locks, retried with exponential backoff, and escalated to a `dead-letter` state when attempts are exhausted.
- **Observability & config:** Structured JSON logs capture task lifecycle events (`AGENT_LOG_LEVEL` controls verbosity) and env-driven config centralises JWT and database settings.
- **Chained agents:** Friend request and acceptance flows automatically enqueue recommendation tasks for both guardians, demonstrating task fan-out.

## Next Targets (Phases 6–8)
- **Realtime signals:** push orchestrator updates to the UI via Server-Sent Events/WebSockets so users see progress without polling.
- **Expanded agents:** introduce scheduling/availability and knowledge-retrieval agents that chain additional tool calls before completing a task.
  - (Partially done) availability and knowledge agents run behind feature flags; extend with richer data sources or chained workflows.
- **Observability:** extend the existing JSON logs with tracing/metrics (task throughput, failure rates) to aid debugging.
- **Config & secrets:** federate secrets into a dedicated vault or secrets manager beyond the current env-var defaults.
- **Rollout controls:** feature-flag agent-backed workflows and add dead-letter handling before enabling in production.
