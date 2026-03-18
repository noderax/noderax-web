import { Reveal } from "@/components/magic/reveal";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className,
}: PageHeaderProps) => (
  <Reveal
    className={cn(
      "space-y-4 rounded-[24px] border border-border/80 bg-transparent px-1 py-1",
      className,
    )}
  >
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0 space-y-3">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.25rem]">
            {title}
          </h1>
          <div className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="surface-panel flex min-w-[14rem] flex-wrap items-center gap-3 rounded-[20px] border px-4 py-3 lg:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
    {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
  </Reveal>
);
