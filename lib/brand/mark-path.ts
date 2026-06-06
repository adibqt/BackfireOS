/**
 * Backfire OS mark — brandkit geometry (32-unit grid).
 *
 * Bold B with a left-pointing recoil chevron (`<`) carved through the core.
 * Tip points toward the stem — campaign force folding back on itself.
 */

/** Stem + bowls (filled). Chevron is subtracted via mask in components. */
export const BACKFIRE_B_SOLID_PATH = [
  "M7 5 H12 V27 H7 A2 2 0 0 1 5 25 V7 A2 2 0 0 1 7 5 Z",
  "M10 5 H21 A5 5 0 0 1 26 10.5 V11.5 A5 5 0 0 1 21 16 H10 Z",
  "M10 16 H21.5 A5.5 5.5 0 0 1 27 21.5 V24.5 A5.5 5.5 0 0 1 21.5 27 H10 Z",
].join(" ");

/** Left-pointing recoil arrow — tip at x≈10.5, mouth open to the right bowls. */
export const BACKFIRE_CHEVRON_PATH = "M23.25 8.75 L23.25 23.25 L9.75 16 Z";

/** @deprecated Use BACKFIRE_B_SOLID_PATH + mask; kept for static SVG assets. */
export const BACKFIRE_B_PATH = `${BACKFIRE_B_SOLID_PATH} ${BACKFIRE_CHEVRON_PATH}`;

export const BACKFIRE_RING_PATH = "M25.5 5.5 A17 17 0 0 0 5.5 25.5";
export const BACKFIRE_RING_INNER_PATH = "M23 8 A14 14 0 0 0 8 23";
export const BACKFIRE_CROSSHAIR_H = "M3 16 H29";
export const BACKFIRE_CROSSHAIR_V = "M16 3 V29";
export const BACKFIRE_TARGET_RING = "M16 16 m-9.5 0 a9.5 9.5 0 1 0 19 0 a9.5 9.5 0 1 0 -19 0";
