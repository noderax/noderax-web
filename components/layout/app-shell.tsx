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
          "min-h-screen transition-[padding] duration-300 lg:pl-64",
          sidebarCollapsed && "lg:pl-20",
        )}
      >
        <Topbar />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
