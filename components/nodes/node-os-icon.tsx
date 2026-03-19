import type { ComponentProps } from "react";
import { Server } from "lucide-react";

import { cn } from "@/lib/utils";

type NodeOsVariant = "ubuntu" | "apple" | "windows" | "server";

const resolveNodeOsVariant = (os: string): NodeOsVariant => {
  const normalized = os.trim().toLowerCase();

  if (normalized.includes("ubuntu")) {
    return "ubuntu";
  }

  if (
    normalized.includes("darwin") ||
    normalized.includes("mac") ||
    normalized.includes("macos") ||
    normalized.includes("osx") ||
    normalized.includes("apple")
  ) {
    return "apple";
  }

  if (normalized.includes("windows") || normalized.startsWith("win")) {
    return "windows";
  }

  return "server";
};

const accentClasses: Record<NodeOsVariant, string> = {
  ubuntu: "text-[#E95420] dark:text-[#FF7A45]",
  apple: "text-foreground",
  windows: "text-sky-600 dark:text-sky-400",
  server: "text-muted-foreground",
};

const UbuntuGlyph = ({ className, ...props }: ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="5.3" r="1.35" fill="currentColor" />
    <circle cx="6.15" cy="15.1" r="1.35" fill="currentColor" />
    <circle cx="17.85" cy="15.1" r="1.35" fill="currentColor" />
    <path
      d="M12 6.95v1.55M7.55 14.25l1.34-.78M16.45 14.25l-1.34-.78"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const AppleGlyph = ({ className, ...props }: ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M16.365 12.643c.024 2.613 2.291 3.482 2.316 3.493-.019.061-.362 1.239-1.19 2.455-.716 1.05-1.46 2.096-2.63 2.118-1.148.021-1.516-.681-2.829-.681-1.314 0-1.722.659-2.809.703-1.128.043-1.988-1.128-2.709-2.174-1.474-2.134-2.6-6.028-1.088-8.655.752-1.305 2.097-2.13 3.558-2.151 1.108-.021 2.154.748 2.829.748.674 0 1.94-.926 3.27-.79.557.023 2.123.225 3.13 1.701-.081.05-1.868 1.09-1.848 3.233Zm-2.083-5.204c.601-.728 1.007-1.743.896-2.752-.867.035-1.916.577-2.539 1.304-.558.648-1.046 1.682-.914 2.672.967.075 1.956-.492 2.557-1.224Z" />
  </svg>
);

const WindowsGlyph = ({ className, ...props }: ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M3 5.35 10.85 4.2v7.16H3V5.35Zm8.95-1.3L21 2.72v8.64h-9.05V4.05ZM3 12.64h7.85v7.16L3 18.65v-6.01Zm8.95 0H21v8.64l-9.05-1.33v-7.31Z" />
  </svg>
);

export const NodeOsIcon = ({
  os,
  className,
  colored = true,
}: {
  os: string;
  className?: string;
  colored?: boolean;
}) => {
  const variant = resolveNodeOsVariant(os);
  const iconClassName = cn(
    className,
    colored ? accentClasses[variant] : "text-current",
  );

  switch (variant) {
    case "ubuntu":
      return <UbuntuGlyph className={iconClassName} />;
    case "apple":
      return <AppleGlyph className={iconClassName} />;
    case "windows":
      return <WindowsGlyph className={iconClassName} />;
    default:
      return <Server aria-hidden="true" className={iconClassName} />;
  }
};
