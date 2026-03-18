import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  default: "surface-panel",
  feature: "surface-feature",
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
        "overflow-hidden rounded-[24px] border",
        variants[variant],
        className,
      )}
    >
      {hasHeader ? (
        <CardHeader
          className={cn(
            "border-b border-border/80 px-5 py-4 sm:px-6",
            headerClassName,
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1.5">
              {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {eyebrow}
                </p>
              ) : null}
              {title ? <CardTitle className="text-lg">{title}</CardTitle> : null}
              {description ? (
                <CardDescription className="max-w-3xl">{description}</CardDescription>
              ) : null}
            </div>
            {action ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
            ) : null}
          </div>
        </CardHeader>
      ) : null}
      <div
        data-slot="section-panel-content"
        className={cn("px-5 py-4 sm:px-6", contentClassName)}
      >
        {children}
      </div>
    </Card>
  );
};
