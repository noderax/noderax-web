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

const sectionNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/nodes": "Nodes",
  "/tasks": "Tasks",
  "/events": "Events",
  "/settings": "Settings",
};

const realtimeConfig = {
  connected: {
    icon: SignalHigh,
    label: "Live",
    className: "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  },
  connecting: {
    icon: SignalLow,
    label: "Connecting",
    className: "border-primary/18 bg-primary/8 text-primary",
  },
  reconnecting: {
    icon: SignalLow,
    label: "Reconnecting",
    className: "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300",
  },
  disconnected: {
    icon: SignalZero,
    label: "Offline",
    className: "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300",
  },
  idle: {
    icon: SignalLow,
    label: "Standby",
    className: "border-border/80 bg-muted/60 text-muted-foreground",
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
    "Workspace";

  useEffect(() => {
    if (authQuery.isError && !session) {
      startTransition(() => {
        router.replace("/login");
      });
    }
  }, [authQuery.isError, router, session]);

  return (
    <header className="sticky top-4 z-20">
      <div className="surface-panel flex flex-col gap-4 rounded-[22px] border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {section}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {sectionNames[pathname] ?? section}
              </h2>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  statusConfig.className,
                )}
              >
                <StatusIcon className="size-3.5" />
                {statusConfig.label}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:min-w-[44rem] lg:justify-end">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search nodes, tasks, events..."
              className="h-10 pl-10"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="control-surface flex items-center gap-3 rounded-[16px] border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-9 border border-border/70">
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
      </div>
    </header>
  );
};
