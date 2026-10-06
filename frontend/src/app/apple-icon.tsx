import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#dc2626" }}>
        <svg width="110" height="110" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2.5c-.4 0-.7.2-.9.5C8.6 6.4 5 10.3 5 14a7 7 0 0 0 14 0c0-3.7-3.6-7.6-6.1-11-.2-.3-.5-.5-.9-.5z" /></svg>
      </div>
    ),
    size,
  );
}
