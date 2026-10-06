import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} | Emergency blood network`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#140f0f", color: "#f6f1f1" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: 28, background: "#dc2626" }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase" }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          <div>Right blood. Right person.</div>
          <div style={{ color: "#f87171" }}>Right now.</div>
        </div>
        <div style={{ fontSize: 32, color: "#c9bfbf" }}>Emergency blood network. Free. Private. Verified.</div>
      </div>
    ),
    size,
  );
}
