import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) => (
  <div
    className={cn(
      "mb-6 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between",
      className,
    )}
  >
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
          {eyebrow}
        </p>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
    {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
  </div>
);
