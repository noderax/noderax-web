"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Siren,
  Workflow,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buttonVariants, Button } from "@/components/ui/button";
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
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-3 border-b border-sidebar-border px-5 py-5", collapsed && "justify-center px-3")}>
        <div className="flex size-11 items-center justify-center rounded-[1.4rem] border border-primary/20 bg-gradient-to-br from-primary/22 via-primary/10 to-transparent shadow-lg shadow-[rgba(88,10,18,0.22)]">
          <BrandMark className="size-8" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-sidebar-foreground">
              Noderax
            </p>
            <p className="text-xs text-muted-foreground">
              Realtime orchestration control plane
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-7 px-3 py-5">
        <div className="space-y-2">
          {!collapsed ? (
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Navigation
            </p>
          ) : null}
          <nav className="space-y-1">
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "lg" }),
                    "h-11 w-full justify-start rounded-2xl px-3 text-sm",
                    collapsed && "justify-center px-0",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
                  )}
                >
                  <item.icon className="size-4" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {!collapsed ? (
          <div className="rounded-3xl border border-sidebar-border/80 bg-sidebar-accent/60 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/15 p-2 text-primary">
                <Boxes className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cluster health</p>
                <p className="text-xs text-muted-foreground">
                  Live status sync via websocket
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

      <div className={cn("border-t border-sidebar-border p-3", collapsed && "p-2")}>
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
          "glass-panel fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border/80 bg-sidebar/70 lg:flex lg:flex-col",
          collapsed ? "w-24" : "w-72",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] max-w-xs border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
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
