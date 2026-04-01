"use client";

import Image from "next/image";
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
  const requestKey = `${size}:${value}`;
  const [qrState, setQrState] = useState<{
    requestKey: string;
    dataUrl: string | null;
    hasError: boolean;
  }>({
    requestKey: "",
    dataUrl: null,
    hasError: false,
  });

  useEffect(() => {
    let cancelled = false;

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
          setQrState({
            requestKey,
            dataUrl: nextDataUrl,
            hasError: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrState({
            requestKey,
            dataUrl: null,
            hasError: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, size, value]);

  const dataUrl = qrState.requestKey === requestKey ? qrState.dataUrl : null;
  const hasError = qrState.requestKey === requestKey && qrState.hasError;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[24px] border bg-white p-3 shadow-sm",
        className,
      )}
      style={{ width: size + 24, height: size + 24 }}
    >
      {dataUrl ? (
        <Image
          src={dataUrl}
          alt="Authenticator setup QR code"
          width={size}
          height={size}
          className="block"
          unoptimized
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
