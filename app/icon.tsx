import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Branded favicon — the emerald ₦ mark used across the site (navbar, footer, OG).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 900,
          borderRadius: 6,
        }}
      >
        ₦
      </div>
    ),
    { ...size }
  );
}
