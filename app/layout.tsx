import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";

import { AppProviders } from "@/components/providers/app-providers";
import { getMaintenanceSnapshotFromCookies } from "@/lib/maintenance";
import { cn } from "@/lib/utils";

import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Noderax",
    template: "%s | Noderax",
  },
  description:
    "Realtime infrastructure control plane for nodes, tasks, metrics, and operational events.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialMaintenanceSnapshot =
    getMaintenanceSnapshotFromCookies(cookieStore);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          plusJakarta.variable,
          jetBrainsMono.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <AppProviders initialMaintenanceSnapshot={initialMaintenanceSnapshot}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
