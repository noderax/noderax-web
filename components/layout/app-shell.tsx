"use client";

import { AlertTriangle } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
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
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#008080", backgroundImage: "none" }}
    >
      <AppSidebar />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300 lg:pl-64",
          sidebarCollapsed && "lg:pl-20",
        )}
        style={{ backgroundColor: "#008080", backgroundImage: "none" }}
      >
        <Topbar />
        <main className="px-4 py-6 sm:px-6 lg:px-8" style={{ backgroundColor: "#008080", backgroundImage: "none" }}>
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            {workspace?.isArchived ? (
              <div
                style={{
                  background: "#fff0c8",
                  border: "2px solid",
                  borderColor: "#ffffff #808080 #808080 #ffffff",
                  padding: "6px 10px",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <AlertTriangle style={{ marginTop: "2px", width: "14px", height: "14px", flexShrink: 0, color: "#884400" }} />
                <p style={{ margin: 0, color: "#000000" }}>
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
    </div>
  );
};
