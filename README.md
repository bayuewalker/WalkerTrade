# WalkerTrade Web Signal

WalkerTrade Web Signal is an AI-assisted, XAU/USD signal platform. Web Signal v0.1 publishes
market-analysis signals only: MT5, broker connectivity, and order execution are out of scope.

## Prerequisites

- Node.js 20.11 or later
- pnpm 9.15 or later (Corepack is recommended)

## Local development

Install the entire workspace with one command:

```bash
pnpm install
```

Copy the non-secret local configuration and then start either long-running application in a
separate terminal:

```bash
cp .env.example .env
pnpm dev:web
pnpm dev:worker
```

The web app listens on `http://localhost:3000`; the worker health endpoint listens on
`http://localhost:4000/health` by default. Configuration is validated at application startup,
and invalid values fail with a clear error before either app begins serving traffic.

## Quality checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

## Workspace layout

- `apps/web` — Next.js signal UI and read API surface
- `apps/worker` — long-running signal-processing runtime
- `packages/*` — shared application boundaries and cross-cutting modules

Provider adapters, Supabase persistence, deterministic analysis, VANTAGE reasoning, signals, and
notifications will be added in their dedicated issues. This foundation deliberately contains no
provider credentials, MT5 integration, or execution code.
