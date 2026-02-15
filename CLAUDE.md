# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

OpenClaw Studio is a single-user Next.js 16 App Router dashboard for managing OpenClaw agents via a WebSocket gateway. The browser connects directly to the gateway over WebSocket for agent interactions; the Next.js server handles only local settings persistence and utility API routes.

## Commands

```bash
npm run dev          # Start dev server (Webpack)
npm run dev:turbo    # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript strict check (tsc --noEmit)
npm run test         # Vitest unit tests
npm run e2e          # Playwright e2e tests (needs `npx playwright install` first)
```

Run a single unit test: `npx vitest run tests/unit/some-file.test.ts`
Run a single e2e test: `npx playwright test tests/e2e/some-file.spec.ts`

## Architecture

See `ARCHITECTURE.md` for full details. Key points:

**Gateway-first**: Agents, sessions, and config live in the OpenClaw Gateway. Studio stores only UI preferences (gateway URL/token, focused view, avatar seeds) in `~/.openclaw/openclaw-studio/settings.json`.

**Layered + feature-first**:
- `src/app/` — Next.js pages and API routes (all API routes use `runtime = "nodejs"`)
- `src/features/` — Feature modules with components, state, and operations
- `src/lib/` — Shared utilities, gateway client, settings coordinator
- `src/components/` — Shared UI components (shadcn/ui in `components/ui/`)

**Data flow**: UI loads settings from `/api/studio` → connects to gateway via WebSocket → single `client.onEvent()` listener classifies events (`presence`/`heartbeat`/`chat`/`agent`) through bridge helpers in `src/features/agents/state/runtimeEventBridge.ts` → dispatches to agent store (React Context + `useReducer`).

**State management**: Reducer-based Context (`AgentStoreProvider` in `src/features/agents/state/store.tsx`). Settings coordination via `StudioSettingsCoordinator` in `src/lib/studio/coordinator.ts` with debounced persistence.

**Gateway client**: `src/lib/gateway/GatewayClient.ts` wraps a vendored `GatewayBrowserClient` (`src/lib/gateway/openclaw/`). Sync upstream with `npm run sync:gateway-client`.

## Key Conventions

- **Path alias**: `@/*` → `./src/*`
- **Styling**: Tailwind CSS 4 utility-first with OKLCH CSS variables. shadcn/ui components use CVA for variants.
- **Client components**: Must use `"use client"` directive. Server components are default.
- **Config mutations**: Always via gateway `config.patch`, never direct writes to `openclaw.json`.
- **Agent file edits**: Via gateway WebSocket (`agents.files.get`/`agents.files.set`), never local filesystem.
- **Settings endpoint**: `/api/studio` is the sole settings path. No parallel endpoints.
- **No new global mutable state** outside `AgentStoreProvider` for agent UI data.
- **Vendored code**: `src/lib/avatars/vendor/` is excluded from linting.

## Testing

- **Unit tests**: `tests/unit/` — Vitest with jsdom, React Testing Library, `@testing-library/jest-dom`. Setup in `tests/setup.ts`.
- **E2E tests**: `tests/e2e/` — Playwright against `http://127.0.0.1:3000`.

## Environment Variables

Key variables (see `.env.example` for all):
- `NEXT_PUBLIC_GATEWAY_URL` — Default gateway WebSocket URL (default: `ws://127.0.0.1:18789`)
- `OPENCLAW_STATE_DIR` — Override state directory (default: `~/.openclaw`)
- `OPENCLAW_TASK_CONTROL_PLANE_BEADS_DIR` — Local Beads directory for control plane
- `OPENCLAW_TASK_CONTROL_PLANE_GATEWAY_BEADS_DIR` — Remote Beads path (runs `br` over SSH)
