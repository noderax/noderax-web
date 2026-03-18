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
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  connecting: {
    icon: SignalLow,
    label: "Connecting",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  reconnecting: {
    icon: SignalLow,
    label: "Reconnecting",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  disconnected: {
    icon: SignalZero,
    label: "Offline",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  },
  idle: {
    icon: SignalLow,
    label: "Standby",
    className: "border-muted bg-muted/60 text-muted-foreground",
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
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
                {section}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                Search scope follows the current page context.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium md:flex",
                statusConfig.className,
              )}
            >
              <StatusIcon className="size-3.5" />
              {statusConfig.label}
            </div>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-2.5 py-1.5 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8 border border-border/70">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 md:block">
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
                  <div className="px-2 pb-2 text-xs text-muted-foreground">
                    JWT-backed access, route protection, and realtime controls.
                  </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                >
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

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search nodes, tasks, events, commands..."
            className="h-11 rounded-2xl border-border/80 bg-card/60 pl-10 shadow-dashboard"
          />
        </div>
      </div>
    </header>
  );
};
