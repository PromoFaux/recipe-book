import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#ed7519",
          borderRadius: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
          lineHeight: 1,
        }}
      >
        🍳
      </div>
    ),
    { ...size }
  );
}
