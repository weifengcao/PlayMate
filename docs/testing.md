# Testing & CI for Agent Workflow

## Local Checks
- `npm run typecheck` — validates TypeScript types across server and client.
- `npm run build` — compiles the client bundle and ensures Vite succeeds.

Run both commands before pushing your branch to catch type or build regressions early.

## Continuous Integration
The GitHub Actions workflow (`.github/workflows/ci.yml`) executes on every push and pull request:
1. Installs dependencies with `npm ci`.
2. Runs `npm run typecheck`.
3. Builds the production bundle via `npm run build`.

Extend the pipeline as new automated tests emerge (e.g., Vitest component tests or Playwright end-to-end checks).
