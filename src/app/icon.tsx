import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#ed7519",
          borderRadius: 108,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 310,
          lineHeight: 1,
        }}
      >
        🍳
      </div>
    ),
    { ...size }
  );
}
