import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#ed7519",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 116,
          lineHeight: 1,
        }}
      >
        🍳
      </div>
    ),
    { width: 192, height: 192 }
  );
}
