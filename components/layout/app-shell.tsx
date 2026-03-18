"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GlowOrb } from "@/components/magic/glow-orb";
import { GridPattern } from "@/components/magic/grid-pattern";
import { useRealtimeBridge } from "@/lib/hooks/use-realtime";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);

  useRealtimeBridge();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GlowOrb className="left-[-10rem] top-[-12rem] h-80 w-80" />
      <GlowOrb
        className="right-[-6rem] top-24 h-72 w-72"
        color="rgba(96, 12, 22, 0.24)"
      />
      <GridPattern className="opacity-30" />
      <AppSidebar />
      <div
        className={cn(
          "relative min-h-screen transition-[padding] duration-300 lg:pl-72",
          sidebarCollapsed && "lg:pl-24",
        )}
      >
        <Topbar />
        <main className="relative z-10 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
};
