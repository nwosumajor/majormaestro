import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — same emerald ₦ brand mark, sized for home-screen bookmarks.
export default function AppleIcon() {
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
          fontSize: 130,
          fontWeight: 900,
          borderRadius: 36,
        }}
      >
        ₦
      </div>
    ),
    { ...size }
  );
}
