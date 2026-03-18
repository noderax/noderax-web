"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  LogOut,
  Menu,
  Search,
  Settings2,
  SignalHigh,
  SignalLow,
  SignalZero,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { GridPattern } from "@/components/magic/grid-pattern";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const sectionNames: Record<string, string> = {
  "/dashboard": "Overview",
  "/nodes": "Node fleet",
  "/tasks": "Task execution",
  "/events": "Operational events",
  "/settings": "Workspace settings",
};

const realtimeConfig = {
  connected: {
    icon: SignalHigh,
    label: "Realtime live",
    className:
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  connecting: {
    icon: SignalLow,
    label: "Connecting",
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  reconnecting: {
    icon: SignalLow,
    label: "Reconnecting",
    className:
      "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  disconnected: {
    icon: SignalZero,
    label: "Offline",
    className:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  idle: {
    icon: SignalLow,
    label: "Standby",
    className: "border-border/70 bg-muted/60 text-muted-foreground",
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
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const clearSession = useAppStore((state) => state.clearSession);

  const statusConfig = realtimeConfig[realtimeStatus];
  const StatusIcon = statusConfig.icon;
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
    Object.entries(sectionNames).find(([key]) => pathname.startsWith(key))?.[1] ??
    "Control plane";

  useEffect(() => {
    if (authQuery.isError && !session) {
      startTransition(() => {
        router.replace("/login");
      });
    }
  }, [authQuery.isError, router, session]);

  return (
    <header className="sticky top-3 z-20">
      <div className="surface-panel relative overflow-hidden rounded-[32px] border px-4 py-4 sm:px-5">
        <GridPattern className="pointer-events-none absolute inset-0 opacity-10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(156,28,41,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_26%)]" />
        <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(320px,1fr)_auto] xl:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="mt-0.5 lg:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/75">
                Command deck
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight">
                  {section}
                </h2>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    statusConfig.className,
                  )}
                >
                  <StatusIcon className="size-3.5" />
                  {statusConfig.label}
                </div>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Search, filtering, and account controls stay pinned to the current workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search nodes, tasks, events, commands..."
                className="h-12 rounded-[1.2rem] pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <ThemeToggle />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="control-surface flex items-center gap-3 rounded-[1.35rem] border px-2.5 py-2 text-left transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-10 border border-border/70">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium">
                  {session?.user.name ?? "Operator"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session?.user.email ?? "operator@noderax.io"}
                </p>
              </div>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <div className="px-2 pb-2 text-xs leading-5 text-muted-foreground">
                  JWT-backed access, route protection, and realtime controls.
                </div>
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
