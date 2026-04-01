import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatTone = "brand" | "success" | "warning" | "danger" | "neutral";

type StatStripItem = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
};

const toneBg: Record<StatTone, string> = {
  brand: "#d0e8ff",
  success: "#d0ffd0",
  warning: "#fff0c8",
  danger: "#ffd0d0",
  neutral: "#d4d0c8",
};

const toneColor: Record<StatTone, string> = {
  brand: "#0a246a",
  success: "#004400",
  warning: "#884400",
  danger: "#880000",
  neutral: "#000000",
};

export const StatStrip = ({
  items,
  className,
}: {
  items: StatStripItem[];
  className?: string;
}) => (
  <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
    {items.map((item, index) => {
      const Icon = item.icon;
      const tone = item.tone ?? "neutral";

      return (
        <div
          key={`${item.label}-${index}`}
          style={{
            background: "#d4d0c8",
            border: "2px solid",
            borderColor: "#ffffff #808080 #808080 #ffffff",
            boxShadow: "1px 1px 0 #404040",
            padding: "0",
            minHeight: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Win2k title bar */}
          <div
            style={{
              background: "linear-gradient(to right, #0a246a, #a6caf0)",
              color: "#ffffff",
              padding: "2px 6px",
              fontSize: "11px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "10px" }}>
              {item.label}
            </span>
            {Icon ? (
              <Icon style={{ width: "12px", height: "12px", opacity: 0.9 }} />
            ) : null}
          </div>
          {/* Win2k content area */}
          <div
            style={{
              padding: "8px 10px",
              flex: 1,
              background: toneBg[tone],
              borderTop: "1px solid #808080",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: toneColor[tone],
                lineHeight: "1",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {item.value}
            </div>
            {item.description ? (
              <p
                style={{
                  marginTop: "6px",
                  fontSize: "10px",
                  color: "#444444",
                  lineHeight: "1.4",
                }}
              >
                {item.description}
              </p>
            ) : null}
          </div>
          {/* Win2k status bar */}
          <div
            style={{
              background: "#d4d0c8",
              borderTop: "2px solid",
              borderTopColor: "#808080",
              padding: "1px 6px",
              fontSize: "10px",
              color: "#000000",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                background: toneColor[tone],
                border: "1px solid #404040",
              }}
            />
            <span>Ready</span>
          </div>
        </div>
      );
    })}
  </div>
);

