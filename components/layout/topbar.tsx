"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronsUpDown,
  LogOut,
  Menu,
  Search,
  Settings2,
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
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const QUEUED_TASK_WARNING_MS = 20_000;
const QUEUED_TASK_DANGER_MS = 90_000;

const sectionNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/nodes": "Nodes",
  "/tasks": "Tasks",
  "/scheduled-tasks": "Scheduled Tasks",
  "/events": "Events",
  "/users": "Users",
  "/settings": "Settings",
};

const sectionDescriptions: Record<string, string> = {
  "/dashboard": "Monitor fleet health, workload, and recent activity.",
  "/nodes": "Inspect node connectivity, telemetry, and runtime state.",
  "/tasks": "Track executions, outcomes, and live operational work.",
  "/scheduled-tasks":
    "Manage recurring shell commands and schedule timing across nodes.",
  "/events": "Review alerts, warnings, and platform event history.",
  "/users": "Manage operators, access roles, and workspace accounts.",
  "/settings": "Manage appearance, session metadata, and preferences.",
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

export const Topbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authQuery = useAuthSession();
  const { session } = authQuery;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const setMobileSidebarOpen = useAppStore(
    (state) => state.setMobileSidebarOpen,
  );
  const clearSession = useAppStore((state) => state.clearSession);

  const statusConfig = realtimeConfig[realtimeStatus];
  const statusHint = realtimeStatusHint[realtimeStatus] ?? "Realtime status";
  const StatusIcon = statusConfig.icon;
  const queuedTaskHealthQuery = useQuery({
    queryKey: ["tasks", "queued-health"],
    queryFn: () => apiClient.getTasks({ status: "queued", limit: 30 }),
    enabled: Boolean(session),
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

  const section =
    Object.entries(sectionNames).find(([key]) =>
      pathname.startsWith(key),
    )?.[1] ?? "Workspace";
  const sectionDescription =
    Object.entries(sectionDescriptions).find(([key]) =>
      pathname.startsWith(key),
    )?.[1] ?? "Manage your operations workspace.";

  useEffect(() => {
    if (authQuery.isError && !session) {
      startTransition(() => {
        router.replace("/login");
      });
    }
  }, [authQuery.isError, router, session]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0">
            {/* <p className="text-xs font-medium text-muted-foreground">Control Center</p> */}
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {section}
              </h1>
              <div
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
                  statusConfig.className,
                )}
              >
                <StatusIcon className="size-3.5" />
                {statusConfig.label}
                <span className="text-muted-foreground">• {statusHint}</span>
              </div>
              {queuedAlertTone ? (
                <div
                  className={cn(
                    "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex",
                    queuedAlertTone === "danger"
                      ? "tone-danger"
                      : "tone-warning",
                  )}
                >
                  <AlertTriangle className="size-3.5" />
                  {queuedAlertTone === "danger"
                    ? "Claim delay critical"
                    : "Claim delay warning"}
                </div>
              ) : null}
            </div>
            <p className="hidden truncate text-sm text-muted-foreground lg:block">
              {sectionDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden w-[280px] md:block lg:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="workspace-search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search nodes, tasks, and events..."
              className="h-10 pl-10"
            />
          </div>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              id="account-menu-trigger"
              className="control-surface flex h-10 items-center gap-3 rounded-xl border px-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="size-8.5 border border-border/70">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium">
                  {session?.user.name ?? "Operator"}
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings2 className="size-4" />
                Settings
              </DropdownMenuItem>
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
