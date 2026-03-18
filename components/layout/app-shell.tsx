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
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%,rgba(0,0,0,0.03))]" />
      <GlowOrb className="left-[-10rem] top-[-12rem] h-96 w-96" />
      <GlowOrb
        className="right-[-6rem] top-24 h-80 w-80"
        color="rgba(96, 12, 22, 0.24)"
      />
      <GlowOrb
        className="bottom-[-8rem] left-[28%] h-72 w-72"
        color="rgba(121, 69, 27, 0.12)"
      />
      <GridPattern className="opacity-20" />
      <AppSidebar />
      <div
        className={cn(
          "relative min-h-screen transition-[padding] duration-300 lg:pl-80",
          sidebarCollapsed && "lg:pl-28",
        )}
      >
        <div className="relative z-10 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
          <Topbar />
          <main className="pt-4">
            <div className="mx-auto w-full max-w-[1540px] space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};
