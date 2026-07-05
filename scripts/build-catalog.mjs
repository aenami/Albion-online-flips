// Generates data/catalog.json and data/enchant-recipes.json from the
// community-maintained Albion Online game data dump (ao-bin-dumps).
// Re-run manually after a major game balance patch: `node scripts/build-catalog.mjs`
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const RAW_ITEMS_URL =
  "https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master/items.json";
const NAMES_ITEMS_URL =
  "https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master/formatted/items.json";

// Only these shopcategory values are considered for the flipping catalog.
// Deliberately excludes tokens, quest/unique items, cosmetics and furniture.
const CATEGORY_WHITELIST = new Set([
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
]);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickName(localizedNames, uniqueName) {
  if (!localizedNames) return uniqueName;
  return (
    localizedNames["ES-ES"] || localizedNames["EN-US"] || uniqueName
  );
}

function tierFromId(id, attrTier) {
  if (attrTier) return Number(attrTier);
  const match = /^T(\d)_/.exec(id);
  return match ? Number(match[1]) : 0;
}

async function main() {
  console.log("Downloading raw game data...");
  const [rawData, namesData] = await Promise.all([
    fetchJson(RAW_ITEMS_URL),
    fetchJson(NAMES_ITEMS_URL),
  ]);

  const nameByUniqueName = new Map();
  for (const entry of namesData) {
    if (entry.UniqueName) {
      nameByUniqueName.set(
        entry.UniqueName,
        pickName(entry.LocalizedNames, entry.UniqueName)
      );
    }
  }

  const items = rawData.items;
  const categories = [
    "equipmentitem",
    "weapon",
    "simpleitem",
    "consumableitem",
    "consumablefrominventoryitem",
    "mount",
  ];

  const catalog = [];
  const enchantRecipes = {};

  for (const categoryKey of categories) {
    for (const raw of asArray(items[categoryKey])) {
      const id = raw["@uniquename"];
      if (!id) continue;

      const shopCategory = raw["@shopcategory"];
      const shopSubcategory = raw["@shopsubcategory1"] || "";
      if (!shopCategory || !CATEGORY_WHITELIST.has(shopCategory)) continue;
      if (shopSubcategory.startsWith("unique_")) continue;

      const enchantments = asArray(raw.enchantments?.enchantment);
      const maxEnchant = enchantments.length
        ? Math.max(...enchantments.map((e) => Number(e["@enchantmentlevel"])))
        : 0;

      catalog.push({
        id,
        name: nameByUniqueName.get(id) || id,
        tier: tierFromId(id, raw["@tier"]),
        category: shopCategory,
        subcategory: shopSubcategory,
        maxEnchant,
      });

      for (const level of enchantments) {
        const upgradeResource = level.upgraderequirements?.upgraderesource;
        if (!upgradeResource) continue; // level 4 (Avalonian) has no upgrade path in this dump
        const levelNum = Number(level["@enchantmentlevel"]);
        if (!enchantRecipes[id]) enchantRecipes[id] = {};
        enchantRecipes[id][levelNum] = {
          resource: upgradeResource["@uniquename"],
          count: Number(upgradeResource["@count"]),
        };
      }
    }
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "catalog.json"),
    JSON.stringify(catalog, null, 2)
  );
  await writeFile(
    path.join(DATA_DIR, "enchant-recipes.json"),
    JSON.stringify(enchantRecipes, null, 2)
  );

  console.log(`catalog.json: ${catalog.length} items`);
  console.log(
    `enchant-recipes.json: ${Object.keys(enchantRecipes).length} enchantable items`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
