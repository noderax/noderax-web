"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

import { GlobalMaintenanceGate } from "@/components/layout/global-maintenance-gate";
import { Toaster } from "@/components/ui/sonner";
import type { MaintenanceSnapshot } from "@/lib/maintenance";

export const AppProviders = ({
  children,
  initialMaintenanceSnapshot,
}: {
  children: React.ReactNode;
  initialMaintenanceSnapshot: MaintenanceSnapshot | null;
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 60_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <GlobalMaintenanceGate initialSnapshot={initialMaintenanceSnapshot} />
        <Toaster position="top-right" richColors />
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
