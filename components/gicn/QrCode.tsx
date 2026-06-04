"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders a check-in code as a scannable QR. The payload is the raw check-in
// code, so a hardware/phone scanner decodes straight into the admin check-in
// input (which is keyboard-driven and auto-focused).
export default function QrCode({ value, size = 128, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2 })
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => {});
    return () => { alive = false; };
  }, [value, size]);

  if (!src) return <div style={{ width: size, height: size }} className={className} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`Check-in QR for ${value}`} width={size} height={size} className={className} />;
}
