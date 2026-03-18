"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Siren,
  Workflow,
} from "lucide-react";

import { BrandBadge } from "@/components/brand/brand-mark";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/nodes", label: "Nodes", icon: Boxes },
  { href: "/tasks", label: "Tasks", icon: Workflow },
  { href: "/events", label: "Events", icon: Siren },
  { href: "/settings", label: "Settings", icon: Settings },
];

const SidebarContent = ({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) => {
  const pathname = usePathname();
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div
        className={cn(
          "surface-panel relative overflow-hidden rounded-[30px] border p-4",
          collapsed && "px-2.5 py-3",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(156,28,41,0.12),transparent_32%)]" />
        <div
          className={cn(
            "relative z-10 flex items-center gap-3",
            collapsed && "justify-center",
          )}
        >
          <BrandBadge size={collapsed ? "sm" : "md"} />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-sidebar-foreground">
                Noderax
              </p>
              <p className="text-xs text-muted-foreground">
                Control deck for fleet, tasks, and live signals
              </p>
            </div>
          ) : null}
        </div>

        {!collapsed ? (
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
            <div className="surface-subtle rounded-2xl border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Mode
              </p>
              <p className="mt-1 text-sm font-medium">Live control</p>
            </div>
            <div className="surface-subtle rounded-2xl border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Access
              </p>
              <p className="mt-1 text-sm font-medium">Protected</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="surface-panel flex-1 rounded-[30px] border p-3">
        <div className="space-y-2">
          {!collapsed ? (
            <div className="px-2 pb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Navigation
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Move between core control-plane surfaces.
              </p>
            </div>
          ) : null}
          <nav className="space-y-1.5">
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-medium transition",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "border-sidebar-primary/25 bg-sidebar-primary/12 text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "border-transparent text-muted-foreground hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl border transition",
                      isActive
                        ? "border-sidebar-primary/20 bg-sidebar-primary/12 text-primary"
                        : "border-transparent bg-transparent text-muted-foreground group-hover:border-sidebar-border group-hover:bg-sidebar-accent/80 group-hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                  </div>
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {!collapsed ? (
          <div className="surface-feature mt-6 rounded-[28px] border p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/15 p-2 text-primary">
                <Activity className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Realtime fabric</p>
                <p className="text-xs text-muted-foreground">
                  Websocket sync and query reconciliation are active.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              Protected routes and live event mutation are enabled.
            </div>
          </div>
        ) : null}
      </div>

      <div className={cn("surface-panel rounded-[28px] border p-2", collapsed && "p-1.5")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon-lg" : "lg"}
          className={cn("w-full rounded-2xl", !collapsed && "justify-between px-3")}
          onClick={toggleSidebar}
        >
          {!collapsed ? <span>Collapse sidebar</span> : null}
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>
    </div>
  );
};

export const AppSidebar = () => {
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);

  return (
    <>
      <aside
        className={cn(
          "glass-panel fixed inset-y-0 left-0 z-30 hidden bg-sidebar/70 lg:flex lg:flex-col",
          collapsed ? "w-28" : "w-80",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[90vw] max-w-sm border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Noderax navigation</SheetTitle>
            <SheetDescription>Navigate between dashboard surfaces.</SheetDescription>
          </SheetHeader>
          <SidebarContent
            collapsed={false}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
