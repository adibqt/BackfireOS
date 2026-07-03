import type { Theme } from "@/lib/theme-provider";

export type Vec3 = [number, number, number];

export type Hero3DPalette = {
  canvasBg: string;
  planeDark: Vec3;
  planeLight: Vec3;
  orbCore: Vec3;
  orbMid: Vec3;
  orbEdge: Vec3;
  orbSpec: Vec3;
  wallDark: Vec3;
  wallLight: Vec3;
  warmTone: Vec3;
};

const DARK_PALETTE: Hero3DPalette = {
  canvasBg: "#0F0E0C",
  planeDark: [0.059, 0.055, 0.047],
  planeLight: [0.086, 0.078, 0.071],
  orbCore: [0.114, 0.102, 0.09],
  orbMid: [0.155, 0.118, 0.095],
  orbEdge: [0.29, 0.118, 0.071],
  orbSpec: [0.045, 0.035, 0.028],
  wallDark: [0.0588, 0.0549, 0.0471],
  wallLight: [0.102, 0.0863, 0.0784],
  warmTone: [0.1647, 0.1294, 0.1059],
};

const LIGHT_PALETTE: Hero3DPalette = {
  canvasBg: "#EBEBE8",
  planeDark: [0.839, 0.835, 0.82],
  planeLight: [0.886, 0.882, 0.867],
  orbCore: [0.82, 0.81, 0.79],
  orbMid: [0.74, 0.73, 0.71],
  orbEdge: [0.722, 0.29, 0.18],
  orbSpec: [0.1, 0.095, 0.09],
  wallDark: [0.812, 0.808, 0.792],
  wallLight: [0.855, 0.851, 0.835],
  warmTone: [0.769, 0.765, 0.749],
};

export function getHero3DPalette(theme: Theme): Hero3DPalette {
  return theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
}
