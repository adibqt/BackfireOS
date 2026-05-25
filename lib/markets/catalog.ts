import type { MacroRegion } from "@/lib/agents/types";

export interface MarketDefinition {
  id: string;
  label: string;
  country: string;
  region: MacroRegion;
  lat?: number;
  lng?: number;
}

export const MARKET_CATALOG: MarketDefinition[] = [
  // South Asia
  { id: "dhaka", label: "Dhaka", country: "Bangladesh", region: "south_asia", lat: 23.8103, lng: 90.4125 },
  { id: "chittagong", label: "Chittagong", country: "Bangladesh", region: "south_asia", lat: 22.3569, lng: 91.7832 },
  { id: "sylhet", label: "Sylhet", country: "Bangladesh", region: "south_asia", lat: 24.8949, lng: 91.8687 },
  { id: "rural_bd", label: "Rural Bangladesh", country: "Bangladesh", region: "south_asia", lat: 24.0, lng: 90.5 },
  { id: "kolkata", label: "Kolkata", country: "India", region: "south_asia", lat: 22.5726, lng: 88.3639 },
  { id: "mumbai", label: "Mumbai", country: "India", region: "south_asia", lat: 19.076, lng: 72.8777 },
  { id: "delhi", label: "Delhi", country: "India", region: "south_asia", lat: 28.7041, lng: 77.1025 },
  { id: "karachi", label: "Karachi", country: "Pakistan", region: "south_asia", lat: 24.8607, lng: 67.0011 },
  { id: "lahore", label: "Lahore", country: "Pakistan", region: "south_asia", lat: 31.5204, lng: 74.3587 },
  { id: "colombo", label: "Colombo", country: "Sri Lanka", region: "south_asia", lat: 6.9271, lng: 79.8612 },
  // MENA
  { id: "dubai", label: "Dubai", country: "UAE", region: "mena", lat: 25.2048, lng: 55.2708 },
  { id: "riyadh", label: "Riyadh", country: "Saudi Arabia", region: "mena", lat: 24.7136, lng: 46.6753 },
  { id: "cairo", label: "Cairo", country: "Egypt", region: "mena", lat: 30.0444, lng: 31.2357 },
  { id: "istanbul", label: "Istanbul", country: "Turkey", region: "mena", lat: 41.0082, lng: 28.9784 },
  { id: "casablanca", label: "Casablanca", country: "Morocco", region: "mena", lat: 33.5731, lng: -7.5898 },
  // SEA
  { id: "jakarta", label: "Jakarta", country: "Indonesia", region: "sea", lat: -6.2088, lng: 106.8456 },
  { id: "bangkok", label: "Bangkok", country: "Thailand", region: "sea", lat: 13.7563, lng: 100.5018 },
  { id: "manila", label: "Manila", country: "Philippines", region: "sea", lat: 14.5995, lng: 120.9842 },
  { id: "ho_chi_minh", label: "Ho Chi Minh City", country: "Vietnam", region: "sea", lat: 10.8231, lng: 106.6297 },
  { id: "kuala_lumpur", label: "Kuala Lumpur", country: "Malaysia", region: "sea", lat: 3.139, lng: 101.6869 },
  { id: "singapore", label: "Singapore", country: "Singapore", region: "sea", lat: 1.3521, lng: 103.8198 },
];

export const MARKET_IDS = new Set(MARKET_CATALOG.map((m) => m.id));

export function getMarket(id: string): MarketDefinition | undefined {
  return MARKET_CATALOG.find((m) => m.id === id);
}

export function marketsByRegion(region: MacroRegion): MarketDefinition[] {
  return MARKET_CATALOG.filter((m) => m.region === region);
}

export const MACRO_REGIONS: MacroRegion[] = ["south_asia", "mena", "sea"];

export function formatCatalogForPrompt(): string {
  return MARKET_CATALOG.map(
    (m) => `- ${m.id}: ${m.label}, ${m.country} (${m.region.replace("_", " ")})`
  ).join("\n");
}
