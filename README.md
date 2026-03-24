<p align="center">
  <img src="./public/logo.webp" alt="Noderax" width="168" />
</p>

<h1 align="center">Noderax Web</h1>

<p align="center">
  A Next.js-based control plane interface for Noderax.
  It brings node inventory, task operations, event history, metrics visibility,
  and role-based administration into a single workspace.
</p>

## Overview

`noderax-web` is the frontend workspace for `noderax-api`.
It authenticates users with JWT-backed sessions and provides a modern operations
panel built with the Next.js App Router, React Query, Zustand, and Socket.IO
realtime updates.

The current product surface includes:

- Dashboard snapshot views
- Node list and detail pages
- Task list, detail, and log streaming
- Event history and filtering
- Admin-only user management
- Session, appearance, and workspace settings
- **Node Action Menu:** Quick reboot and agent restart with confirmation dialogs
- Realtime node status and telemetry updates

## Features

- JWT login with cookie-based session handling
- Next.js proxy layer for `noderax-api` REST endpoints
- Socket.IO connection to the `/realtime` namespace
- Realtime online and offline node state updates
- Centralized React Query cache for nodes, tasks, events, and metrics
- Admin actions:
  - create node
  - delete node
  - create task
  - list users
  - create user
- Redesigned **Package Management** screens with full-width cards and structured metadata
- Node-focused telemetry cards on the dashboard with integrated action menus
- Operating-system-aware node icons
- **Accessible Dashboards:** Resolved "Nest Interactive Elements" (Base UI #31) errors by using `useRouter` for card navigation
- Standard CRM-style dashboard shell inspired by shadcn patterns

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- TanStack React Query
- Zustand
- Socket.IO Client
- shadcn/ui-based primitives
- Tailwind CSS 4
- Zod
- React Hook Form
- Sonner

## Application Flow

The web app does not send raw browser traffic directly to the backend with a
manually managed JWT. Instead, Next.js route handlers act as the session and
proxy layer.

Flow summary:

1. The user signs in on `/login`.
2. `app/api/auth/login` calls upstream `POST /auth/login`.
3. The JWT and normalized session are stored in cookies.
4. Browser-side data requests go through `app/api/proxy/[...path]`.
5. The proxy forwards the cookie token as `Authorization: Bearer <token>`.
6. Realtime access uses `app/api/auth/realtime-token` and connects to the
   Socket.IO `/realtime` namespace.

## API Surface Used by the Web App

This interface intentionally uses only the user-facing control plane endpoints.
`/agent/*` routes are not used by the web app and remain reserved for the Go
agent.

Primary endpoints used:

- `POST /auth/login`
- `GET /users/me`
- `GET /users`
- `POST /users`
- `GET /nodes`
- `GET /nodes/:id`
- `POST /nodes`
- `DELETE /nodes/:id`
- `GET /tasks`
- `GET /tasks/:id`
- `GET /tasks/:id/logs`
- `POST /tasks`
- `GET /events`
- `GET /metrics`

## Pages

- `/dashboard`
  - snapshot summary cards
  - node telemetry board
  - recent events
  - recent node activity
- `/nodes`
  - server-side `status`, `search`, `limit`, and `offset` filters
  - admin-only create node action
  - admin-only delete node action
- `/nodes/[id]`
  - node detail
  - recent telemetry
  - running tasks
  - recent events
- `/tasks`
  - server-side `status`, `nodeId`, `limit`, and `offset` filters
  - client-side text search
  - admin-only create task action
- `/tasks/[id]`
  - task detail
  - execution metadata
  - related events
  - live log stream
- `/events`
  - server-side `severity`, `nodeId`, `type`, and `limit` controls
  - client-side text search
- `/users`
  - admin-only user management
  - user listing and create user dialog
- `/settings`
  - session, appearance, and preference surfaces
- `/login`
  - authentication screen

## Realtime Behavior

The app connects to the Socket.IO `/realtime` namespace.
Realtime connection state is surfaced in both the sidebar and the topbar.

Primary events consumed by the interface:

- `node.status.updated`
- `metrics.ingested`
- `task.created`
- `task.updated`
- `event.created`

Visible nodes are automatically subscribed when they appear in active UI data.
That keeps these surfaces updated without a page refresh:

- node list
- dashboard node telemetry board
- dashboard recent node activity
- node detail
- task detail node metadata

## Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

You can also use `.env` if that better matches your local setup.

Current variables:

```bash
# Required: backend REST base used by Next server routes.
# The current Noderax backend serves browser REST traffic from /api/v1.
NODERAX_API_URL=http://localhost:3000/api/v1

# Optional: client-side REST base fallback. Use the same /api/v1 base.
NEXT_PUBLIC_NODERAX_API_URL=http://localhost:3000/api/v1

# Optional: Socket.IO namespace target. Examples:
# http://localhost:3000
# http://localhost:3000/realtime
# The frontend always connects to the /realtime namespace and still uses
# the default Socket.IO transport path /socket.io.
# HTTP API prefixes such as /v1 or /api/v1 do not apply to realtime.
NEXT_PUBLIC_NODERAX_WS_URL=http://localhost:3000/realtime
```

Important notes:

- `NODERAX_API_URL` is required.
- If the backend serves browser REST traffic under `/v1`, the same base should
  be used here.
- Realtime connects to `/realtime` on the backend origin, not `/v1/realtime`.
- If `NEXT_PUBLIC_NODERAX_WS_URL` is omitted, the frontend falls back to
  `NEXT_PUBLIC_NODERAX_API_URL` or the current browser origin.

## Local Development

This repository uses `pnpm` as its package manager.

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

By default:

- web app: `http://localhost:3000`
- backend target: whatever is configured in `NODERAX_API_URL`

Note:
`pnpm dev` uses port `3000` by default for the frontend. If your API runs as
a separate local service, update `NODERAX_API_URL` to its real address. If you
are using a reverse proxy on the same origin, the example values can remain as
they are.

## PNPM Scripts

- `pnpm dev` - start the development server
- `pnpm build` - create a production build
- `pnpm start` - start the production server
- `pnpm lint` - run ESLint
- `pnpm typecheck` - run TypeScript checks

## Directory Structure

```text
app/
  (auth)/login/         Login route
  api/                  Auth and upstream proxy routes
  dashboard/            Dashboard page
  nodes/                Node list and detail routes
  tasks/                Task list and detail routes
  events/               Events page
  users/                Admin-only users page
  settings/             Settings

components/
  brand/                Logo and brand components
  dashboard/            Dashboard-specific components
  layout/               Sidebar, topbar, shell
  nodes/                Node screens and actions
  tasks/                Task screens and actions
  users/                User management components
  ui/                   Shared UI primitives
  magic/                Visual effect layer

lib/
  api.ts                Frontend API client
  auth.ts               Session and auth helpers
  hooks/                React Query and realtime hooks
  websocket.ts          Socket.IO client
  noderax.ts            DTO to view-model mappers

store/
  useAppStore.ts        UI state and session store
```

## Authorization Model

- All authenticated users can access:
  - dashboard
  - nodes
  - node detail
  - tasks
  - task detail
  - events
  - settings
- Only `admin` users can access or perform:
  - user management
  - create and delete node actions
  - create task actions

The UI hides admin-only actions for non-admin users.

## Current Limitations

- The dashboard operates on snapshot windows rather than authoritative global totals.
- Text search on tasks and events is currently client-side.
- SSH or interactive terminal sessions are not implemented yet.
- The web app does not use `/agent/*` endpoints.

## Verification

Recommended project checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Development Notes

- For new data integrations, the cleanest flow is usually:
  `lib/api.ts` -> `lib/hooks` -> UI surface.
- Realtime cache synchronization is centralized in
  `lib/hooks/use-realtime.ts`.
- Auth cookies and upstream token handling are centralized in
  `app/api/auth/*` and `lib/auth.ts`.
- New control-plane integrations should deliberately avoid `/agent/*`
  unless the work is specifically for the Go agent.

## License

If no formal license file is defined for this repository, treat it as an
internal project used within the team.
