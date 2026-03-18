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
    shell: "border border-border/70 bg-card/72 shadow-dashboard",
    grid: "opacity-10",
    overlay:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_28%)]",
  },
  feature: {
    shell: "border border-primary/15 bg-card/78 shadow-dashboard",
    grid: "opacity-20",
    overlay:
      "bg-[radial-gradient(circle_at_top_left,rgba(156,28,41,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%)]",
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
        "relative overflow-hidden rounded-[30px] py-0",
        variants[variant].shell,
        className,
      )}
    >
      <GridPattern className={cn("pointer-events-none absolute inset-0", variants[variant].grid)} />
      <div className={cn("pointer-events-none absolute inset-0", variants[variant].overlay)} />
      {hasHeader ? (
        <CardHeader
          className={cn(
            "relative z-10 border-b border-border/60 px-6 py-5",
            headerClassName,
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1.5">
              {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/70">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <CardTitle className="text-xl font-semibold tracking-tight">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="max-w-2xl leading-6">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
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
