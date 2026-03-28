<p align="center">
  <img src="./public/logo.webp" alt="Noderax" width="168" />
</p>

<h1 align="center">Noderax Web</h1>

<p align="center">
  Workspace-aware Next.js control plane for Noderax.
  It brings inventory, live telemetry, task operations, teams, members,
  setup, and platform administration into a single UI.
</p>

## Overview

`noderax-web` is the frontend for `noderax-api`. It uses the Next.js App Router, route-handler proxy endpoints, React Query, Zustand, and Socket.IO-based realtime state sync.

Current product surface:

- First-run setup screen for installer-managed deployments
- Workspace selection and default-workspace fallback
- Workspace-scoped dashboard, nodes, tasks, events, scheduled tasks, members, and teams
- Platform-admin global user directory with create, edit, activate, deactivate, and guarded delete flows
- Unified settings surface with:
  - `Account`
  - `Workspace`
  - `Platform` for platform admins
- GitHub-style workspace settings with:
  - workspace profile editing
  - workspace timezone control
  - default-workspace selection
  - dangerous workspace deletion flow
- Node detail with live telemetry, packages, running tasks, and event history
- Task detail with live lifecycle and logs
- Platform-admin workspaces page
- User-centric membership management:
  - `Users` is the only account creation surface
  - workspace members are assigned from existing active users
  - teams can only add active members already attached to the workspace

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- TanStack React Query
- Zustand
- Socket.IO Client
- Radix + Base UI primitives
- Tailwind CSS 4
- Zod
- React Hook Form
- Sonner

## Application Flow

Browser traffic is session-based and proxied through Next.js.

1. The user signs in on `/login`.
2. `app/api/auth/login` authenticates against the API.
3. JWT-backed session data is stored in cookies.
4. Browser-side REST calls go through `app/api/proxy/[...path]`.
5. The proxy forwards the access token upstream.
6. Workspace selection is persisted via the `noderax_workspace` cookie.
7. Realtime access uses `app/api/auth/realtime-token` and connects to `/realtime`.

## Route Model

The current primary UI uses workspace-scoped routes:

- `/workspaces`
- `/w/[workspaceSlug]/dashboard`
- `/w/[workspaceSlug]/nodes`
- `/w/[workspaceSlug]/nodes/[id]`
- `/w/[workspaceSlug]/nodes/[id]/packages`
- `/w/[workspaceSlug]/tasks`
- `/w/[workspaceSlug]/tasks/[id]`
- `/w/[workspaceSlug]/scheduled-tasks`
- `/w/[workspaceSlug]/events`
- `/w/[workspaceSlug]/members`
- `/w/[workspaceSlug]/teams`
- `/w/[workspaceSlug]/workspace-settings`

Additional top-level routes:

- `/login`
- `/settings`
- `/setup`
- `/users`

The top-level non-workspace pages continue to exist as convenience or fallback surfaces, but the workspace-scoped routes are the main operator path.

## Features

- JWT login with cookie-based session handling
- Next.js proxy layer over `noderax-api`
- Workspace-aware navigation and workspace cookie persistence
- Default workspace fallback when a prior workspace disappears
- Platform-admin workspace creation and workspace inventory
- Workspace member and team management built on top of the global user directory
- Unified settings page:
  - account preferences
  - workspace settings
  - platform runtime settings
- Platform-admin user lifecycle management with self-protection and last-admin guardrails
- Task operations:
  - on-demand task runs
  - multi-node batch dispatch
  - scheduled task creation
  - cancel flow for active tasks
- Package management through node detail
- Live node telemetry and task lifecycle updates

## Authorization Model

- `platform_admin`
  - can create workspaces
  - can access `/users`
  - can create, edit, activate, deactivate, and delete global users
  - can access `Platform` settings
  - can choose the platform default workspace
- Workspace `owner` and `admin`
  - can manage workspace settings
  - can add existing active users as members
  - can manage teams that are composed from workspace members
  - can delete the workspace if it is not the current default
- Workspace `member` and `viewer`
  - can use read surfaces allowed by the API

The UI hides actions that the current session should not perform.

## User And Membership Model

- `Users` is the platform-wide identity directory and the only place where new accounts are created.
- `Members` does not create users inline. It assigns an existing active user to the current workspace with a workspace role.
- `Teams` only offer workspace-local grouping. The add-member list is limited to active workspace members who are not already in the selected team.
- Inactive users remain visible in historical membership lists, but they cannot sign in and they cannot be added to new workspaces or teams.
- Removing a workspace membership also removes that user from every team in the same workspace.

## Settings UX

The unified `/settings` page now contains:

- `Account`
  - profile/session/preferences
  - timezone preferences used across task scheduling displays
- `Workspace`
  - workspace name and slug
  - workspace timezone
  - default-workspace status and selection
  - danger zone with typed confirmation for deletion
- `Platform`
  - installer-managed runtime settings for app, auth, database, Redis, and agent behavior
  - visible only to `platform_admin`

## Realtime Behavior

The app consumes these realtime events:

- `node.status.updated`
- `metrics.ingested`
- `task.created`
- `task.updated`
- `event.created`

Important implementation notes:

- Node subscriptions are derived from active queries only
- Node detail cache writes are scoped to the matching `nodeId`
- Task detail cache writes are scoped to the matching `taskId`
- This prevents cross-node telemetry pollution when multiple nodes are visible in cache history

Surfaces kept fresh by realtime:

- workspace dashboard
- workspace node list
- node detail
- task detail
- recent event views

## API Surface Used By The Web App

Primary upstream routes:

- `POST /auth/login`
- `GET /users`
- `GET /users/me`
- `POST /users`
- `PATCH /users/:userId`
- `DELETE /users/:userId`
- `PATCH /users/me/preferences`
- `GET /workspaces`
- `POST /workspaces`
- `PATCH /workspaces/:workspaceId`
- `DELETE /workspaces/:workspaceId`
- `GET /workspaces/:workspaceId/members`
- `GET /workspaces/:workspaceId/assignable-users`
- `GET /workspaces/:workspaceId/teams`
- `GET /workspaces/:workspaceId/teams/:teamId/members`
- `GET /workspaces/:workspaceId/nodes`
- `GET /workspaces/:workspaceId/tasks`
- `GET /workspaces/:workspaceId/scheduled-tasks`
- `GET /workspaces/:workspaceId/events`
- `GET /workspaces/:workspaceId/metrics`
- `GET /platform-settings`
- `PATCH /platform-settings`
- `GET /setup/status`
- `POST /setup/validate/postgres`
- `POST /setup/validate/redis`
- `POST /setup/install`

## Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Current variables:

```bash
NODERAX_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_NODERAX_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_NODERAX_WS_URL=http://localhost:3000/realtime
```

Notes:

- `NODERAX_API_URL` is required.
- Realtime connects to `/realtime`, not `/api/v1/realtime`.
- If `NEXT_PUBLIC_NODERAX_WS_URL` is omitted, the app falls back to the API origin or browser origin.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Useful checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Directory Structure

```text
app/
  (auth)/login/         Login route
  api/                  Auth and proxy handlers
  setup/                Installer UI
  settings/             Unified settings
  workspaces/           Platform workspace inventory
  w/[workspaceSlug]/    Workspace-scoped app routes

components/
  dashboard/
  layout/
  nodes/
  settings/
  tasks/
  users/
  workspaces/
  ui/

lib/
  api.ts
  auth.ts
  hooks/
  noderax.ts
  websocket.ts
  workspace.ts

store/
  useAppStore.ts
```

## Current Limitations

- Dashboard totals are still operational snapshots, not a full analytics product.
- Text search on some list views remains client-side.
- Interactive terminal or SSH sessions are not implemented.
- Password reset and admin-driven password rotation are not implemented yet.
- Teams are currently organizational only; they are not yet used for task targeting, filtering, or authorization decisions.
- The UI assumes the API is the source of truth for role enforcement and workspace access.

## Notes

- Realtime cache synchronization is centralized in `lib/hooks/use-realtime.ts`.
- Session and upstream token handling live in `app/api/auth/*` and `lib/auth.ts`.
- New control-plane features should normally flow through:
  `lib/api.ts` -> `lib/hooks` -> route/page -> UI component.
