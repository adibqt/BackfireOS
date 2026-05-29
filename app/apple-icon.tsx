import { ImageResponse } from "next/og";

// iOS home-screen / app icon. Full-bleed gradient tile (iOS rounds the corners
// itself) with the white Backfire "B" mark centred.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#ffffff" fill-rule="nonzero" d="M9 6 H12.5 V26 H9 A2 2 0 0 1 7 24 V8 A2 2 0 0 1 9 6 Z M10 6 H20 A4 4 0 0 1 24 10 V11 A4 4 0 0 1 20 15 H10 Z M10 14 H20.5 A4.5 4.5 0 0 1 25 18.5 V21.5 A4.5 4.5 0 0 1 20.5 26 H10 Z M13 10.5 L19.5 12.5 L19.5 8.5 Z M13 20 L20 22.5 L20 17.5 Z"/></svg>`;

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
          background:
            "linear-gradient(135deg, #ff9aa0 0%, #ff4d57 46%, #c0212e 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={116}
          height={116}
          alt="Backfire OS"
          src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
        />
      </div>
    ),
    { ...size }
  );
}
