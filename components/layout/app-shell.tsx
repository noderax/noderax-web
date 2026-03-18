"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useRealtimeBridge } from "@/lib/hooks/use-realtime";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);

  useRealtimeBridge();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-300 lg:pl-72",
          sidebarCollapsed && "lg:pl-24",
        )}
      >
        <div className="mx-auto w-full max-w-[1520px] px-4 py-4 sm:px-5 lg:px-8 lg:py-6">
          <Topbar />
          <main className="pt-6">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
