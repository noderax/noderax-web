"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

export function QrCode({
  value,
  size = 192,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setDataUrl(null);
    setHasError(false);

    void QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#111827",
        light: "#00000000",
      },
    })
      .then((nextDataUrl) => {
        if (!cancelled) {
          setDataUrl(nextDataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[24px] border bg-white p-3 shadow-sm",
        className,
      )}
      style={{ width: size + 24, height: size + 24 }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Authenticator setup QR code"
          width={size}
          height={size}
          className="block"
        />
      ) : hasError ? (
        <div className="px-4 text-center text-xs text-muted-foreground">
          QR code could not be generated.
        </div>
      ) : (
        <div
          className="animate-pulse rounded-[16px] bg-slate-200"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}
