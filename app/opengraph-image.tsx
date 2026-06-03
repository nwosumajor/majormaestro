import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MajorGBN — Forensic Bank Charge Recovery for Nigerian Corporates";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b1220 0%, #15233f 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top row: wordmark + compliance line */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0b1220",
                fontSize: 34,
                fontWeight: 900,
              }}
            >
              ₦
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "white", fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
                MajorGBN
              </span>
              <span style={{ color: "#94a3b8", fontSize: 17, letterSpacing: 2 }}>
                FORENSIC RECOVERY
              </span>
            </div>
          </div>
          <span style={{ color: "#34d399", fontSize: 20, fontWeight: 600 }}>
            CBN · BOFIA · NDPA 2023
          </span>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            <span style={{ color: "white" }}>Recover what your bank&nbsp;</span>
            <span style={{ color: "#34d399" }}>owes you.</span>
          </div>
          <span style={{ color: "#cbd5e1", fontSize: 30, lineHeight: 1.4, maxWidth: 940 }}>
            Forensic audits that recover excess interest, COT &amp; LC charges from Nigerian banks.
          </span>
        </div>

        {/* bottom: zero-risk badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(16,185,129,0.12)",
              border: "2px solid rgba(16,185,129,0.4)",
              borderRadius: 999,
              padding: "14px 28px",
              color: "#6ee7b7",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            No Recovery. No Fee. — 30% success fee
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
