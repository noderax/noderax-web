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
    <div
      className={cn("overflow-hidden", className)}
      style={{
        background: "#d4d0c8",
        border: "2px solid",
        borderColor: "#ffffff #808080 #808080 #ffffff",
        boxShadow: "1px 1px 0 #404040",
        borderRadius: "0",
      }}
    >
      {hasHeader ? (
        <div
          className={cn(headerClassName)}
          style={{
            background: "linear-gradient(to right, #0a246a, #a6caf0)",
            color: "#ffffff",
            padding: "3px 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            borderBottom: "2px solid #404040",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow ? (
              <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: "#c8d8f0", margin: 0 }}>
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#ffffff", margin: 0, letterSpacing: 0 }}>
                {title}
              </p>
            ) : null}
            {description ? (
              <p style={{ fontSize: "10px", color: "#c8d8f0", margin: 0, marginTop: "1px" }}>
                {description}
              </p>
            ) : null}
          </div>
          {action ? (
            <div style={{ display: "flex", flexShrink: 0, flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        data-slot="section-panel-content"
        className={cn("px-5 py-4 sm:px-6", contentClassName)}
        style={{ background: "#d4d0c8" }}
      >
        {children}
      </div>
    </div>
  );
};

