import type { MarketDefinition } from "./catalog";

/** Equirectangular projection (WGS84 → SVG coords). */
export function projectLatLng(
  lat: number,
  lng: number,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

/** Simplified continent wireframes for 960×480 equirectangular viewBox. */
export const WORLD_LAND_PATHS: string[] = [
  // North America
  "M 48,72 L 118,48 L 198,58 L 248,88 L 268,128 L 252,168 L 218,188 L 168,182 L 128,158 L 88,128 L 58,98 Z",
  // Greenland
  "M 268,42 L 298,38 L 318,58 L 308,78 L 278,82 L 262,62 Z",
  // South America
  "M 218,198 L 248,192 L 268,218 L 272,268 L 258,328 L 232,368 L 208,352 L 198,298 L 204,238 Z",
  // Europe
  "M 448,72 L 488,62 L 518,78 L 512,108 L 478,118 L 448,102 Z",
  // Africa
  "M 458,128 L 508,118 L 538,148 L 548,208 L 532,288 L 498,328 L 468,312 L 452,248 L 448,178 Z",
  // Middle East / West Asia
  "M 518,108 L 568,98 L 598,118 L 588,148 L 548,158 L 518,138 Z",
  // Russia / North Asia
  "M 518,48 L 648,42 L 768,52 L 848,68 L 868,98 L 828,118 L 698,108 L 568,98 L 518,78 Z",
  // South / Southeast Asia
  "M 568,148 L 648,138 L 728,158 L 768,188 L 748,228 L 688,248 L 628,238 L 578,208 L 558,178 Z",
  // East Asia
  "M 728,98 L 808,88 L 868,108 L 878,148 L 848,178 L 788,188 L 738,168 L 718,128 Z",
  // Japan
  "M 878,118 L 892,108 L 898,128 L 888,148 L 874,138 Z",
  // Australia
  "M 768,288 L 848,278 L 878,308 L 868,348 L 818,362 L 768,338 Z",
  // Indonesia archipelago
  "M 718,228 L 768,218 L 798,238 L 778,258 L 728,252 Z",
];

export function marketCoords(market: MarketDefinition, w: number, h: number) {
  if (market.lat == null || market.lng == null) return null;
  return projectLatLng(market.lat, market.lng, w, h);
}

export function formatCoords(lat?: number, lng?: number): string {
  if (lat == null || lng == null) return "—";
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `LAT: ${Math.abs(lat).toFixed(4)}${latDir} // LNG: ${Math.abs(lng).toFixed(4)}${lngDir}`;
}
