import { cn } from "@/lib/utils";

export const GridPattern = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "pointer-events-none absolute inset-0 app-shell-grid opacity-40",
      className,
    )}
    aria-hidden="true"
  />
);
