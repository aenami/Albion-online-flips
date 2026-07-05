// Client-safe constant lists for filter UIs. Deliberately does not import
// lib/catalog.ts, which pulls the multi-MB catalog.json into any bundle that
// touches it - these are just the small option lists filters need.
import { LOCATIONS, type Location } from "./albionApi";

export const CITIES: Location[] = [...LOCATIONS];
export const NON_BLACK_MARKET_CITIES: Location[] = LOCATIONS.filter(
  (l) => l !== "Black Market"
);

export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const QUALITIES = [1, 2, 3, 4, 5] as const;
export const ENCHANT_LEVELS = [0, 1, 2, 3, 4] as const;

export const ALL_CATEGORIES = [
  "armor",
  "offhand",
  "accessories",
  "gatherergear",
  "tools",
  "melee",
  "ranged",
  "magic",
  "mounts",
  "resources",
  "materials",
  "products",
  "consumables",
] as const;

export const BLACK_MARKET_CATEGORIES = [
  "armor",
  "offhand",
  "melee",
  "ranged",
  "magic",
] as const;
