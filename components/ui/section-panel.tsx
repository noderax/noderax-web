import { GridPattern } from "@/components/magic/grid-pattern";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionPanelProps = {
  title?: string;
  description?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "feature";
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

const variants = {
  default: {
    shell: "surface-panel border",
    grid: "opacity-10",
    overlay:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%),radial-gradient(circle_at_top_right,rgba(156,28,41,0.08),transparent_26%)]",
  },
  feature: {
    shell: "surface-feature border",
    grid: "opacity-18",
    overlay:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%),radial-gradient(circle_at_top_left,rgba(156,28,41,0.12),transparent_30%)]",
  },
};

export const SectionPanel = ({
  title,
  description,
  eyebrow,
  action,
  children,
  variant = "default",
  className,
  headerClassName,
  contentClassName,
}: SectionPanelProps) => {
  const hasHeader = Boolean(title || description || eyebrow || action);

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-[34px] py-0",
        variants[variant].shell,
        className,
      )}
    >
      <GridPattern className={cn("pointer-events-none absolute inset-0", variants[variant].grid)} />
      <div className={cn("pointer-events-none absolute inset-0", variants[variant].overlay)} />
      {hasHeader ? (
        <CardHeader
          className={cn(
            "relative z-10 border-b border-border/60 px-6 py-6",
            headerClassName,
          )}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              {eyebrow ? (
                <p className="inline-flex rounded-full border border-primary/16 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <CardTitle className="text-xl font-semibold tracking-tight sm:text-[1.4rem]">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="max-w-3xl leading-6">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">{action}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          "relative z-10 p-6",
          !hasHeader && "pt-6",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
};
