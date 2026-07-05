import catalogData from "@/data/catalog.json";
import enchantRecipesData from "@/data/enchant-recipes.json";
import { BLACK_MARKET_CATEGORIES as BLACK_MARKET_CATEGORIES_LIST } from "./constants";

export interface CatalogItem {
  id: string;
  name: string;
  tier: number;
  category: string;
  subcategory: string;
  maxEnchant: number;
}

export const catalog: CatalogItem[] = catalogData as CatalogItem[];

export interface EnchantRecipeLevel {
  resource: string;
  count: number;
}

// itemId -> enchantment level ("1" | "2" | "3") -> material required
export type EnchantRecipes = Record<string, Record<string, EnchantRecipeLevel>>;
export const enchantRecipes: EnchantRecipes =
  enchantRecipesData as EnchantRecipes;

const catalogById = new Map(catalog.map((item) => [item.id, item]));

export function getCatalogItem(id: string): CatalogItem | undefined {
  return catalogById.get(id);
}

/** Black Market only accepts weapons, armor and off-hands. */
export const BLACK_MARKET_CATEGORIES = new Set<string>(
  BLACK_MARKET_CATEGORIES_LIST
);

export function isBlackMarketEligible(item: CatalogItem): boolean {
  return BLACK_MARKET_CATEGORIES.has(item.category);
}

export function enchantedId(baseId: string, level: number): string {
  return level === 0 ? baseId : `${baseId}@${level}`;
}

export function baseIdOf(itemId: string): string {
  return itemId.split("@")[0];
}

export function enchantLevelOf(itemId: string): number {
  const at = itemId.indexOf("@");
  return at === -1 ? 0 : Number(itemId.slice(at + 1));
}

/** Every tradeable item_id string the market API should be queried for,
 * expanding each catalog entry into its enchantment-level variants. */
export function expandItemIds(items: CatalogItem[] = catalog): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.id);
    for (let level = 1; level <= item.maxEnchant; level++) {
      ids.push(enchantedId(item.id, level));
    }
  }
  return ids;
}
