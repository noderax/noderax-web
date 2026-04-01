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
- Linux node detail with live telemetry, packages, running tasks, and event history
- Two-step `Add node` onboarding that collects node metadata first, then generates a one-click agent install command and shows live bootstrap progress
- Linux node interactive terminal route with live xterm.js console and persisted transcript history
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
7. General realtime access uses `app/api/auth/realtime-token` and connects to `/realtime`.
8. Interactive terminal access uses the same auth token flow but connects to the dedicated `/terminal` namespace.

## Route Model

The current primary UI uses workspace-scoped routes:

- `/workspaces`
- `/w/[workspaceSlug]/dashboard`
- `/w/[workspaceSlug]/nodes`
- `/w/[workspaceSlug]/nodes/[id]`
- `/w/[workspaceSlug]/nodes/[id]/terminal`
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
- Linux node maintenance UX and node telemetry visibility
- Two-step node install command generation with copyable bootstrap command, API URL, installer script URL, and live bootstrap progress feedback
- Interactive terminal UX with:
  - xterm.js live console tunneled through the agent
  - recent session history
  - persisted transcript timeline
  - transcript "Terminal view" rendering
  - live-session status messaging and termination feedback
  - 5-minute reattach grace window after leaving the page
- Platform and workspace audit surfaces
- Workspace-scoped topbar search with grouped suggestions and `?q=` route handoff
- Unified settings page:
  - account preferences
  - change password
  - token management and MFA enrollment
  - workspace settings
  - platform runtime settings, SMTP testing, warned API restart, and identity provider management
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
  - workspace name and slug with automatic slug generation
  - workspace timezone
  - notification levels (INFO, WARNING, CRITICAL) for Email and Telegram
  - archive / restore
  - default-workspace status and selection
  - danger zone with typed confirmation for deletion
- `Platform`
  - installer-managed runtime settings for app, auth, database, Redis, mail, and agent behavior
  - SMTP draft validation
  - `Restart API` button rendered to the left of `Save platform settings`
  - warning dialog before restart is requested
  - reconnect banner and health polling while the API process is restarting
  - timeout + retry handling if the API does not come back quickly
  - forced sign-in recovery if restart invalidates the current session, such as after a `JWT_SECRET` change
  - OIDC provider configuration and discovery testing
  - visible only to `platform_admin`

Platform restart UX details:

- Restart does not auto-save the current draft
- unsaved platform changes are discarded if the API reconnects after restart
- the web app polls `/api/proxy/health` and waits for a new `bootId`
- once a new process instance is detected, platform settings are refetched automatically
- if authenticated refetch returns `401`, the operator is redirected to `/login?message=api-restarted`

## Realtime Behavior

The app consumes these realtime events:

- `node.status.updated`
- `metrics.ingested`
- `task.created`
- `task.updated`
- `event.created`
- `node-install.updated`

Important implementation notes:

- Node subscriptions are derived from active queries only
- Node detail cache writes are scoped to the matching `nodeId`
- Task detail cache writes are scoped to the matching `taskId`
- This prevents cross-node telemetry pollution when multiple nodes are visible in cache history

Surfaces kept fresh by realtime:

- workspace dashboard
- workspace node list
- add-node install status panel
- node detail
- node terminal
- task detail
- recent event views

Platform settings restart notes:

- API restart recovery is not realtime-driven; it uses explicit health polling
- the UI keeps the platform panel visible during reconnect instead of dropping into a generic error state
- a timeout leaves the operator in a warned retry state rather than an infinite spinner

Terminal-specific notes:

- Live terminal traffic uses the separate `/terminal` namespace rather than the general `/realtime` stream
- Only the session creator can attach to and control a live terminal session
- Persisted transcript chunks are polled while a session is active so the history panel stays current
- Leaving the page no longer closes the shell immediately; the UI advertises the 5-minute reattach window
- The selected live session also polls its own detail state so missed close events do not leave the UI stuck in `terminating`

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
- `POST /workspaces/:workspaceId/nodes/:nodeId/terminal-sessions`
- `GET /workspaces/:workspaceId/nodes/:nodeId/terminal-sessions`
- `GET /workspaces/:workspaceId/terminal-sessions/:sessionId`
- `GET /workspaces/:workspaceId/terminal-sessions/:sessionId/chunks`
- `POST /workspaces/:workspaceId/terminal-sessions/:sessionId/terminate`
- `DELETE /workspaces/:workspaceId/task-templates/:id`
- `GET /workspaces/:workspaceId/nodes`
- `POST /workspaces/:workspaceId/nodes/:id/team`
- `POST /workspaces/:workspaceId/node-installs`
- `GET /workspaces/:workspaceId/node-installs/:installId`
- `POST /workspaces/:workspaceId/nodes/:id/maintenance/enable`
- `POST /workspaces/:workspaceId/nodes/:id/maintenance/disable`
- `GET /workspaces/:workspaceId/tasks`
- `POST /workspaces/:workspaceId/tasks/teams/:teamId`
- `GET /workspaces/:workspaceId/scheduled-tasks`
- `GET /workspaces/:workspaceId/events`
- `GET /workspaces/:workspaceId/metrics`
- `GET /workspaces/:workspaceId/audit-logs`
- `GET /audit-logs`
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
- The `noderax_api_url` cookie is honored only by setup routes. Runtime auth, proxy, realtime, and terminal flows ignore it once the platform is installed.
- Successful setup install and successful sign-in clear any stale `noderax_api_url` cookie so runtime traffic stays pinned to the configured origin.
- The terminal namespace resolves from `NEXT_PUBLIC_NODERAX_WS_URL`, then `NEXT_PUBLIC_NODERAX_API_URL`, then the active browser origin. It does not call setup config APIs at runtime.
- `Add node` uses the active system API URL as the agent installer origin and strips `/v1` or `/api/v1` before writing `--api-url`.

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
pnpm test
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
- Direct SSH passthrough is not implemented; terminal access is provided through the managed agent session.
- The UI assumes the API is the source of truth for role enforcement and workspace access.

## Notes

- Realtime cache synchronization is centralized in `lib/hooks/use-realtime.ts`.
- Session and upstream token handling live in `app/api/auth/*` and `lib/auth.ts`.
- New control-plane features should normally flow through:
  `lib/api.ts` -> `lib/hooks` -> route/page -> UI component.
