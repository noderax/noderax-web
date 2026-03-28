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

- First-run setup screen for installer-managed deployments with PostgreSQL, Redis, and optional SMTP validation
- Workspace selection and default-workspace fallback
- Workspace-scoped dashboard, nodes, tasks, events, scheduled tasks, members, and teams
- Platform-admin global user directory with invite-first create, edit, resend invite, activate, deactivate, and guarded delete flows
- Public auth lifecycle routes for:
  - password login
  - OIDC login buttons for enabled providers
  - MFA challenge / recovery verification
  - invitation acceptance
  - forgot password
  - reset password
- Account security controls with QR-based TOTP MFA enrollment and recovery codes
- Platform identity controls for SSO provider management and provider testing
- Platform-admin audit view plus workspace audit history
- Workspace task templates and team-targeted task execution flows
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
  - workspace members are assigned from existing accepted active users
  - teams can only add active members already attached to the workspace
  - teams can own nodes and be used as run/schedule targets
- Workspace archive UX:
  - archived banner inside workspace routes
  - archive / restore actions
  - read-only operator controls while archived
- Workspace-scoped topbar search with grouped suggestions for nodes, tasks, schedules, events, members, and teams
- Fleet inventory page for agent version, platform telemetry, team ownership, and maintenance visibility

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
- `/w/[workspaceSlug]/audit`
- `/w/[workspaceSlug]/members`
- `/w/[workspaceSlug]/teams`
- `/w/[workspaceSlug]/workspace-settings`

Additional top-level routes:

- `/login`
- `/forgot-password`
- `/invite/[token]`
- `/reset-password/[token]`
- `/settings`
- `/setup`
- `/users`
- `/audit`
- `/fleet`

The top-level non-workspace pages continue to exist as convenience or fallback surfaces, but the workspace-scoped routes are the main operator path.

## Features

- JWT login with cookie-based session handling
- OIDC login start/callback through public auth handlers
- MFA challenge and recovery-code flows during login
- Invite acceptance and password reset flows through public auth handlers
- Next.js proxy layer over `noderax-api`
- Workspace-aware navigation and workspace cookie persistence
- Default workspace fallback when a prior workspace disappears
- Platform-admin workspace creation and workspace inventory
- Workspace archive / restore controls with read-only UI states
- Workspace member and team management built on top of the global user directory
- Task templates with prefill/save UX in task creation flows
- Team-targeted task runs and schedule targeting
- Node maintenance UX and fleet telemetry visibility
- Platform and workspace audit surfaces
- Workspace-scoped topbar search with grouped suggestions and `?q=` route handoff
- Unified settings page:
  - account preferences
  - change password
  - token management and MFA enrollment
  - workspace settings
  - platform runtime settings, SMTP testing, and identity provider management
- Platform-admin user lifecycle management with self-protection and last-admin guardrails
- Task operations:
  - on-demand task runs
  - multi-node batch dispatch
  - team-targeted runs
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
- New users are invited first. They activate themselves from the invite link before they can sign in or be assigned anywhere.
- `Members` does not create users inline. It assigns an existing accepted active user to the current workspace with a workspace role.
- `Teams` are workspace-local groups built from active members, and they also act as operational owners for nodes and team-targeted task/schedule flows.
- Inactive users remain visible in historical membership lists, but they cannot sign in and they cannot be added to new workspaces or teams.
- Removing a workspace membership also removes that user from every team in the same workspace.

## Settings UX

The unified `/settings` page now contains:

- `Account`
  - profile/session/preferences
  - timezone preferences used across task scheduling displays
  - persisted notification email preferences
  - authenticated password change with forced re-login
  - token management
  - QR-based MFA enrollment, recovery-code regeneration, and disable flow
- `Workspace`
  - workspace name and slug
  - workspace timezone
  - archive / restore
  - default-workspace status and selection
  - danger zone with typed confirmation for deletion
- `Platform`
  - installer-managed runtime settings for app, auth, database, Redis, mail, and agent behavior
  - SMTP draft validation
  - OIDC provider configuration and discovery testing
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
- `GET /auth/providers`
- `GET /auth/oidc/:provider/start`
- `GET /auth/oidc/:provider/callback`
- `POST /auth/mfa/setup/initiate`
- `POST /auth/mfa/setup/confirm`
- `POST /auth/mfa/challenge/verify`
- `POST /auth/mfa/recovery/verify`
- `POST /auth/mfa/recovery/regenerate`
- `DELETE /auth/mfa`
- `GET /auth/invitations/:token`
- `POST /auth/invitations/:token/accept`
- `POST /auth/password/forgot`
- `GET /auth/password/reset/:token`
- `POST /auth/password/reset/:token`
- `GET /users`
- `GET /users/me`
- `POST /users`
- `POST /users/:userId/resend-invite`
- `PATCH /users/:userId`
- `DELETE /users/:userId`
- `PATCH /users/me/preferences`
- `POST /users/me/password`
- `GET /workspaces`
- `POST /workspaces`
- `PATCH /workspaces/:workspaceId`
- `DELETE /workspaces/:workspaceId`
- `GET /workspaces/:workspaceId/members`
- `GET /workspaces/:workspaceId/assignable-users`
- `GET /workspaces/:workspaceId/search`
- `GET /workspaces/:workspaceId/teams`
- `GET /workspaces/:workspaceId/teams/:teamId/members`
- `GET /workspaces/:workspaceId/task-templates`
- `POST /workspaces/:workspaceId/task-templates`
- `PATCH /workspaces/:workspaceId/task-templates/:id`
- `DELETE /workspaces/:workspaceId/task-templates/:id`
- `GET /workspaces/:workspaceId/nodes`
- `POST /workspaces/:workspaceId/nodes/:id/team`
- `POST /workspaces/:workspaceId/nodes/:id/maintenance/enable`
- `POST /workspaces/:workspaceId/nodes/:id/maintenance/disable`
- `GET /workspaces/:workspaceId/tasks`
- `POST /workspaces/:workspaceId/tasks/teams/:teamId`
- `GET /workspaces/:workspaceId/scheduled-tasks`
- `GET /workspaces/:workspaceId/events`
- `GET /workspaces/:workspaceId/metrics`
- `GET /workspaces/:workspaceId/audit-logs`
- `GET /audit-logs`
- `GET /fleet/nodes`
- `GET /platform-settings`
- `PATCH /platform-settings`
- `POST /platform-settings/validate/smtp`
- `GET /setup/status`
- `POST /setup/validate/postgres`
- `POST /setup/validate/redis`
- `POST /setup/validate/smtp`
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
- The runtime can also be overridden by the `noderax_api_url` cookie during setup/onboarding flows.

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
- Fleet is intentionally an inventory/telemetry view right now; agent release rollout orchestration is not part of the current web surface.
- The UI assumes the API is the source of truth for role enforcement and workspace access.

## Notes

- Realtime cache synchronization is centralized in `lib/hooks/use-realtime.ts`.
- Session and upstream token handling live in `app/api/auth/*` and `lib/auth.ts`.
- New control-plane features should normally flow through:
  `lib/api.ts` -> `lib/hooks` -> route/page -> UI component.
