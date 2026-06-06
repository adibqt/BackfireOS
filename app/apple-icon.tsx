import { ImageResponse } from "next/og";
import { BACKFIRE_B_SOLID_PATH, BACKFIRE_CHEVRON_PATH } from "@/lib/brand/mark-path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><mask id="c"><rect width="32" height="32" fill="white"/><path fill="black" d="${BACKFIRE_CHEVRON_PATH}"/></mask></defs><path fill="#ffffff" fill-rule="nonzero" mask="url(#c)" d="${BACKFIRE_B_SOLID_PATH}"/></svg>`;

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
          background: "linear-gradient(135deg, #ff9aa0 0%, #ff4d57 46%, #c0212e 100%)",
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
