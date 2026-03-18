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

import { BrandBadge } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-4",
          collapsed && "justify-center px-2.5",
        )}
      >
        <BrandBadge size={collapsed ? "sm" : "md"} />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Noderax
            </p>
            <p className="text-xs text-muted-foreground">Operations workspace</p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 px-3 py-4">
        {!collapsed ? (
          <div className="px-2 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Navigation
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
                  "flex h-11 items-center gap-3 rounded-[16px] px-3 text-sm font-medium transition",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4",
                    isActive && "text-primary",
                  )}
                />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={cn("border-t border-sidebar-border p-3", collapsed && "p-2")}>
        {!collapsed ? (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium">Secure workspace</p>
            <p className="text-xs text-muted-foreground">
              Nodes, tasks, metrics, and events in one place.
            </p>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size={collapsed ? "icon-lg" : "lg"}
          className={cn("w-full rounded-[16px]", !collapsed && "justify-between px-3")}
          onClick={toggleSidebar}
        >
          {!collapsed ? <span>Collapse</span> : null}
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
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block",
          collapsed ? "w-24" : "w-72",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[88vw] max-w-sm border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
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
