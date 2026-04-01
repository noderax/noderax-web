import type { Metadata } from "next";
import { Cousine } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

import "./globals.css";

// Cousine is the closest Google Font to Courier/system mono
const cousine = Cousine({
  variable: "--font-mono-ui",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Noderax",
    template: "%s | Noderax",
  },
  description:
    "Realtime infrastructure control plane for nodes, tasks, metrics, and operational events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          cousine.variable,
          "min-h-screen bg-background text-foreground",
        )}
        style={{ fontFamily: "'Tahoma', 'MS Sans Serif', 'Arial', sans-serif" }}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
