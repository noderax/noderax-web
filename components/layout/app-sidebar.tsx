"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Siren,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { BrandBadge } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const realtimeLabels = {
  connected: "Realtime connected",
  connecting: "Connecting",
  reconnecting: "Reconnecting",
  degraded: "Degraded",
  disconnected: "Offline",
  idle: "Standby",
} as const;

type NavLinkItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: never;
};

type NavGroupItem = {
  label: string;
  icon: LucideIcon;
  children: Array<{
    href: string;
    label: string;
  }>;
  href?: never;
};

type NavigationItem = NavLinkItem | NavGroupItem;

const SidebarContent = ({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) => {
  const pathname = usePathname();
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);
  const session = useAppStore((state) => state.session);
  const isAdmin = session?.user.role === "admin";
  const tasksSectionActive =
    pathname === "/tasks" ||
    pathname.startsWith("/tasks/") ||
    pathname === "/scheduled-tasks" ||
    pathname.startsWith("/scheduled-tasks/");
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const isTasksExpanded = tasksSectionActive || tasksExpanded;

  const navigation = [
    {
      label: "Overview",
      items: [{ href: "/dashboard", label: "Dashboard", icon: Home }],
    },
    {
      label: "Operations",
      items: [
        { href: "/nodes", label: "Nodes", icon: Boxes },
        ...(isAdmin
          ? [
              {
                label: "Tasks",
                icon: Workflow,
                children: [
                  { href: "/tasks", label: "Task runs" },
                  { href: "/scheduled-tasks", label: "Scheduled tasks" },
                ],
              },
            ]
          : [{ href: "/tasks", label: "Tasks", icon: Workflow }]),
        { href: "/events", label: "Events", icon: Siren },
      ],
    },
    {
      label: "Workspace",
      items: [
        ...(session?.user.role === "admin"
          ? [{ href: "/users", label: "Users", icon: Users }]
          : []),
        { href: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ] satisfies Array<{
    label: string;
    items: NavigationItem[];
  }>;

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b border-sidebar-border px-5",
          collapsed && "justify-center px-0",
        )}
      >
        <BrandBadge size={collapsed ? "sm" : "md"} />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Noderax
            </p>
            <p className="text-xs text-muted-foreground">Operations center</p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navigation.map((group) => (
            <div key={group.label} className="space-y-1.5">
              {!collapsed ? (
                <p className="px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  if ("children" in item) {
                    const childItems = item.children ?? [];

                    if (collapsed) {
                      return (
                        <Link
                          key={item.label}
                          href={childItems[0]?.href ?? "/tasks"}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-10 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium transition-colors",
                            "justify-center px-0",
                            tasksSectionActive
                              ? "tone-brand shadow-sm"
                              : "text-sidebar-foreground/72 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "size-4",
                              tasksSectionActive
                                ? "text-tone-brand"
                                : "text-muted-foreground",
                            )}
                          />
                        </Link>
                      );
                    }

                    return (
                      <div key={item.label} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setTasksExpanded((current) => !current)}
                          className={cn(
                            "flex h-10 w-full items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium transition-colors",
                            tasksSectionActive
                              ? "tone-brand shadow-sm"
                              : "text-sidebar-foreground/72 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "size-4",
                              tasksSectionActive
                                ? "text-tone-brand"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              isTasksExpanded && "rotate-180",
                            )}
                          />
                        </button>
                        {isTasksExpanded ? (
                          <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
                            {childItems.map((child) => {
                              const childActive =
                                pathname === child.href ||
                                pathname.startsWith(`${child.href}/`);

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={onNavigate}
                                  className={cn(
                                    "flex h-9 items-center rounded-lg border border-transparent px-3 text-sm transition-colors",
                                    childActive
                                      ? "tone-brand shadow-sm"
                                      : "text-sidebar-foreground/72 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                  )}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "tone-brand shadow-sm"
                          : "text-sidebar-foreground/72 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4",
                          isActive
                            ? "text-tone-brand"
                            : "text-muted-foreground",
                        )}
                      />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "border-t border-sidebar-border p-3",
          collapsed && "p-2.5",
        )}
      >
        {!collapsed ? (
          <div className="mb-3 rounded-2xl border border-sidebar-border bg-background/70 px-3.5 py-3">
            <p className="text-xs font-medium text-sidebar-foreground">
              Workspace
            </p>
            <p className="mt-1 text-sm font-semibold text-sidebar-foreground">
              {realtimeLabels[realtimeStatus]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nodes, tasks, metrics, and events in one control surface.
            </p>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size={collapsed ? "icon-lg" : "lg"}
          className={cn(
            "w-full rounded-xl",
            !collapsed && "justify-between px-3",
          )}
          onClick={toggleSidebar}
        >
          {!collapsed ? <span>Collapse</span> : null}
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export const AppSidebar = () => {
  const collapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore(
    (state) => state.setMobileSidebarOpen,
  );

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block",
          collapsed ? "w-20" : "w-64",
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
            <SheetDescription>
              Navigate between dashboard surfaces.
            </SheetDescription>
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
