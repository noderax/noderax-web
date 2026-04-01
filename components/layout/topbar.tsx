"use client";

import { Suspense, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronsUpDown,
  LogOut,
  Menu,
  Search,
  Settings2,
  Shield,
  SignalHigh,
  SignalLow,
  SignalZero,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useWorkspaceSearch } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import { buildWorkspacePath } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { WorkspaceSearchHitDto } from "@/lib/types";

const QUEUED_TASK_WARNING_MS = 20_000;
const QUEUED_TASK_DANGER_MS = 90_000;

const sectionNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/nodes": "Nodes",
  "/tasks": "Tasks",
  "/scheduled-tasks": "Scheduled Tasks",
  "/events": "Events",
  "/audit": "Audit",
  "/members": "Members",
  "/teams": "Teams",
  "/workspace-settings": "Workspace Settings",
  "/workspaces": "Workspaces",
  "/users": "Users",
  "/settings": "Settings",
};

const sectionDescriptions: Record<string, string> = {
  "/dashboard": "Monitor node health, workload, and recent activity.",
  "/nodes": "Inspect node connectivity, telemetry, and runtime state.",
  "/tasks": "Track executions, outcomes, and live operational work.",
  "/scheduled-tasks":
    "Manage recurring shell commands and schedule timing across nodes.",
  "/events": "Review alerts, warnings, and platform event history.",
  "/audit": "Inspect append-only admin and security activity across the platform or current workspace.",
  "/members": "Manage who can access this workspace and which role they hold.",
  "/teams": "Organize workspace members into teams for collaboration.",
  "/workspace-settings":
    "Configure workspace name, slug, and execution timezone.",
  "/workspaces": "Create, switch, and manage isolated operational workspaces.",
  "/users": "Manage global operator accounts and platform roles.",
  "/settings": "Manage appearance, session metadata, and preferences.",
};

const resolveSectionPath = (pathname: string) => {
  if (pathname.startsWith("/w/")) {
    const segments = pathname.split("/").filter(Boolean);
    return `/${segments[2] ?? "dashboard"}`;
  }

  return pathname;
};

const resolveWorkspaceChildPath = (pathname: string) => {
  if (!pathname.startsWith("/w/")) {
    return "dashboard";
  }

  const segments = pathname.split("/").filter(Boolean).slice(2);
  return segments.length ? segments.join("/") : "dashboard";
};

const realtimeStatusHint: Record<string, string> = {
  connected: "Stream healthy",
  connecting: "Handshake in progress",
  reconnecting: "Recovering link (tasks continue via HTTP polling)",
  degraded: "Realtime delayed (tasks continue via HTTP polling)",
  disconnected: "Realtime offline (tasks continue via HTTP polling)",
  idle: "Waiting for session",
};

const realtimeConfig = {
  connected: {
    icon: SignalHigh,
    label: "Live",
    className: "tone-success",
  },
  connecting: {
    icon: SignalLow,
    label: "Connecting",
    className: "tone-brand",
  },
  reconnecting: {
    icon: SignalLow,
    label: "Reconnecting",
    className: "tone-warning",
  },
  degraded: {
    icon: SignalLow,
    label: "Degraded",
    className: "tone-warning",
  },
  disconnected: {
    icon: SignalZero,
    label: "Offline",
    className: "tone-danger",
  },
  idle: {
    icon: SignalLow,
    label: "Standby",
    className: "tone-neutral",
  },
};

const TopbarContent = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authQuery = useAuthSession();
  const { workspace, workspaceId, workspaceSlug, data: workspaces = [] } =
    useWorkspaceContext();
  const { session } = authQuery;
  const isPlatformAdmin = session?.user.role === "platform_admin";
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setMobileSidebarOpen = useAppStore(
    (state) => state.setMobileSidebarOpen,
  );
  const setActiveWorkspaceSlug = useAppStore(
    (state) => state.setActiveWorkspaceSlug,
  );
  const clearSession = useAppStore((state) => state.clearSession);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const isWorkspaceScopedRoute = pathname.startsWith("/w/");
  const workspaceSearchQuery = useWorkspaceSearch(
    deferredSearchQuery,
    5,
    Boolean(session && workspaceId && isWorkspaceScopedRoute),
  );

  const statusConfig = realtimeConfig[realtimeStatus];
  const statusHint = realtimeStatusHint[realtimeStatus] ?? "Realtime status";
  const StatusIcon = statusConfig.icon;
  const sectionPath = resolveSectionPath(pathname);
  const currentWorkspaceChildPath = resolveWorkspaceChildPath(pathname);
  const searchResults = useMemo<
    Array<{ key: string; label: string; route: string; hits: WorkspaceSearchHitDto[] }>
  >(
    () => {
      const results = workspaceSearchQuery.data;
      if (!results) {
        return [];
      }

      return [
        { key: "nodes", label: "Nodes", route: "nodes", hits: results.nodes },
        { key: "tasks", label: "Tasks", route: "tasks", hits: results.tasks },
        {
          key: "scheduledTasks",
          label: "Scheduled Tasks",
          route: "scheduled-tasks",
          hits: results.scheduledTasks,
        },
        { key: "events", label: "Events", route: "events", hits: results.events },
        { key: "members", label: "Members", route: "members", hits: results.members },
        { key: "teams", label: "Teams", route: "teams", hits: results.teams },
      ].filter((group) => group.hits.length > 0);
    },
    [workspaceSearchQuery.data],
  );
  const showWorkspaceSearchResults =
    isWorkspaceScopedRoute && isSearchFocused && deferredSearchQuery.length > 0;
  const queuedTaskHealthQuery = useQuery({
    queryKey: ["tasks", "queued-health", workspaceId ?? "none"],
    queryFn: () =>
      apiClient.getTasks(
        { status: "queued", limit: 30 },
        workspaceId ?? undefined,
      ),
    enabled: Boolean(session && workspaceId),
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const queuedAges = (queuedTaskHealthQuery.data ?? [])
    .map((task) => Date.now() - Date.parse(task.createdAt))
    .filter((value) => Number.isFinite(value));
  const oldestQueuedMs = queuedAges.length ? Math.max(...queuedAges) : 0;
  const queuedAlertTone =
    oldestQueuedMs >= QUEUED_TASK_DANGER_MS
      ? "danger"
      : oldestQueuedMs >= QUEUED_TASK_WARNING_MS
        ? "warning"
        : null;
  const initials =
    session?.user.name
      .split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "NR";

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await apiClient.logout();
      clearSession();
      queryClient.clear();
      startTransition(() => {
        router.replace("/login");
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleWorkspaceSelect = (nextWorkspaceSlug: string) => {
    if (!nextWorkspaceSlug || nextWorkspaceSlug === workspaceSlug) {
      return;
    }

    setActiveWorkspaceSlug(nextWorkspaceSlug);
    startTransition(() => {
      router.push(buildWorkspacePath(nextWorkspaceSlug, currentWorkspaceChildPath));
    });
  };

  const section =
    Object.entries(sectionNames).find(([key]) =>
      sectionPath.startsWith(key),
    )?.[1] ?? "Workspace";
  const sectionDescription =
    Object.entries(sectionDescriptions).find(([key]) =>
      sectionPath.startsWith(key),
    )?.[1] ?? "Manage your operations workspace.";

  useEffect(() => {
    if (authQuery.isError && !session) {
      startTransition(() => {
        router.replace("/login");
      });
    }
  }, [authQuery.isError, router, session]);

  useEffect(() => {
    if (!searchParams.has("q")) {
      return;
    }

    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams, setSearchQuery]);

  const handleSearchResultSelect = (route: string) => {
    if (!workspaceSlug) {
      return;
    }

    const nextQuery = deferredSearchQuery.trim();
    const target = buildWorkspacePath(
      workspaceSlug,
      nextQuery ? `${route}?q=${encodeURIComponent(nextQuery)}` : route,
    );

    setSearchQuery(nextQuery);
    setIsSearchFocused(false);
    startTransition(() => {
      router.push(target);
    });
  };

  return (
    <header
      className="sticky top-0 z-20"
      style={{
        background: "#d4d0c8",
        borderBottom: "2px solid #808080",
        boxShadow: "0 1px 0 #404040",
        backdropFilter: "none",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
            style={{ background: "#d4d0c8", border: "2px solid", borderColor: "#ffffff #808080 #808080 #ffffff", borderRadius: "0" }}
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h1
                className="truncate"
                style={{ fontSize: "13px", fontWeight: "bold", color: "#000000", letterSpacing: 0 }}
              >
                {section}
              </h1>
              <div
                className={cn(
                  "hidden items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
                )}
                style={{
                  background: statusConfig.className.includes("success") ? "#d0ffd0" : statusConfig.className.includes("warning") ? "#fff0c8" : statusConfig.className.includes("danger") ? "#ffd0d0" : "#d0e8ff",
                  border: "2px solid",
                  borderColor: "#ffffff #808080 #808080 #ffffff",
                  color: "#000000",
                  fontSize: "10px",
                  borderRadius: "0",
                }}
              >
                <StatusIcon className="size-3.5" />
                {statusConfig.label}
                <span style={{ color: "#444444" }}>• {statusHint}</span>
              </div>
              {queuedAlertTone ? (
                <div
                  className="hidden items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium sm:inline-flex"
                  style={{
                    background: queuedAlertTone === "danger" ? "#ffd0d0" : "#fff0c8",
                    border: "2px solid",
                    borderColor: "#ffffff #808080 #808080 #ffffff",
                    color: queuedAlertTone === "danger" ? "#880000" : "#884400",
                    fontSize: "10px",
                    borderRadius: "0",
                  }}
                >
                  <AlertTriangle className="size-3.5" />
                  {queuedAlertTone === "danger"
                    ? "Claim delay critical"
                    : "Claim delay warning"}
                </div>
              ) : null}
            </div>
            <p
              className="hidden truncate lg:block"
              style={{ fontSize: "10px", color: "#444444" }}
            >
              {sectionDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {workspace ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="hidden h-10 items-center gap-3 px-3 text-left focus-visible:outline-none md:flex"
                style={{
                  background: "#d4d0c8",
                  border: "2px solid",
                  borderColor: "#ffffff #808080 #808080 #ffffff",
                  borderRadius: "0",
                  fontSize: "11px",
                }}
              >
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
                    {workspace.name}
                  </p>
                  <p className="truncate" style={{ fontSize: "9px", color: "#444444" }}>
                    {workspace.defaultTimezone}
                  </p>
                </div>
                <ChevronsUpDown className="size-3.5" style={{ color: "#444444" }} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {workspaces.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleWorkspaceSelect(item.slug)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.slug} · {item.defaultTimezone}
                        </p>
                      </div>
                      {item.slug === workspaceSlug ? (
                        <span className="text-xs text-muted-foreground">
                          Current
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <div className="relative hidden w-[280px] md:block lg:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "#444444" }} />
            <Input
              id="workspace-search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsSearchFocused(false);
                }, 120);
              }}
              placeholder={
                isWorkspaceScopedRoute
                  ? "Search nodes, tasks, schedules, members, and teams..."
                  : "Search this page"
              }
              className="h-10 pl-10"
              style={{
                background: "#ffffff",
                border: "2px solid",
                borderColor: "#808080 #ffffff #ffffff #808080",
                borderRadius: "0",
                fontSize: "11px",
                color: "#000000",
              }}
            />
            {showWorkspaceSearchResults ? (
              <div
                className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 p-2"
                style={{
                  background: "#d4d0c8",
                  border: "2px solid",
                  borderColor: "#ffffff #808080 #808080 #ffffff",
                  boxShadow: "2px 2px 0 #404040",
                }}
              >
                {workspaceSearchQuery.isPending ? (
                  <p style={{ padding: "6px", fontSize: "11px", color: "#444444" }}>
                    Searching workspace…
                  </p>
                ) : searchResults.length ? (
                  <div className="space-y-1">
                    {searchResults.map((group) => (
                      <div key={group.key} className="space-y-1">
                        <p style={{ padding: "4px 6px 2px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#444444" }}>
                          {group.label}
                        </p>
                        {group.hits.map((hit) => (
                          <button
                            key={`${group.key}-${hit.id}`}
                            type="button"
                            className="flex w-full flex-col px-3 py-2 text-left"
                            style={{ background: "#ffffff", border: "1px solid #808080", fontSize: "11px", color: "#000000", cursor: "pointer" }}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSearchResultSelect(group.route);
                            }}
                          >
                            <span style={{ fontWeight: "bold" }}>{hit.title}</span>
                            {hit.subtitle ? (
                              <span style={{ fontSize: "10px", color: "#444444" }}>
                                {hit.subtitle}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ padding: "6px", fontSize: "11px", color: "#444444" }}>
                    No results matched &quot;{deferredSearchQuery}&quot;.
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              id="account-menu-trigger"
              className="flex h-10 items-center gap-3 px-2.5 text-left focus-visible:outline-none"
              style={{
                background: "#d4d0c8",
                border: "2px solid",
                borderColor: "#ffffff #808080 #808080 #ffffff",
                borderRadius: "0",
              }}
            >
              <Avatar
                className="size-8.5"
                style={{ border: "2px solid #808080", borderRadius: "0" }}
              >
                <AvatarFallback style={{ background: "#0a246a", color: "#ffffff", fontSize: "11px", fontWeight: "bold", borderRadius: "0" }}>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>
                  {session?.user.name ?? "Operator"}
                </p>
              </div>
              <ChevronsUpDown className="size-3.5" style={{ color: "#444444" }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {workspace ? (
                <DropdownMenuItem
                  onClick={() =>
                    startTransition(() => {
                      router.push("/settings?tab=workspace");
                    })
                  }
                >
                  Workspace settings
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings2 className="size-4" />
                Settings
              </DropdownMenuItem>
              {isPlatformAdmin ? (
                <DropdownMenuItem
                  onClick={() => router.push("/settings?tab=platform")}
                >
                  <Shield className="size-4" />
                  Platform settings
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => router.push("/settings#token-management")}
              >
                Token management
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="size-4" />
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

const TopbarFallback = () => (
  <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
    <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" />
  </header>
);

export const Topbar = () => (
  <Suspense fallback={<TopbarFallback />}>
    <TopbarContent />
  </Suspense>
);
