"use client";

import { AlertTriangle } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ControlPlaneUpdateFreeze } from "@/components/layout/control-plane-update-freeze";
import { Topbar } from "@/components/layout/topbar";
import { useRealtimeBridge } from "@/lib/hooks/use-realtime";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const { workspace } = useWorkspaceContext();

  useRealtimeBridge();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300 lg:pl-64",
          sidebarCollapsed && "lg:pl-20",
        )}
      >
        <Topbar />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            {workspace?.isArchived ? (
              <div className="flex items-start gap-3 rounded-[20px] border border-tone-warning/30 bg-tone-warning/8 px-4 py-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-warning" />
                <p>
                  This workspace is archived. You can still inspect data, but
                  create, update, delete, enrollment, and scheduling actions are
                  read-only until the workspace is restored.
                </p>
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
      <ControlPlaneUpdateFreeze />
    </div>
  );
};
