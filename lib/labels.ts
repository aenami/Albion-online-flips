import type { FlipType, RiskLevel, TravelKind } from "./flipEngine";

export const FLIP_TYPE_LABELS: Record<FlipType, string> = {
  "same-city": "Mismo mercado",
  "cross-city": "Entre ciudades",
  "black-market-direct": "Mercado Negro",
  "enchant-black-market": "Encantar + Mercado Negro",
};

export const FLIP_TYPE_HINTS: Record<FlipType, string> = {
  "same-city": "Compra y venta en la misma ciudad, capturando el spread del mercado.",
  "cross-city": "Compra barato en una ciudad y vende en otra con mejor precio.",
  "black-market-direct": "Compra en una ciudad regular y vende de inmediato al Mercado Negro, libre de impuestos.",
  "enchant-black-market": "Compra el ítem base + runas/almas/reliquias, encántalo, y véndelo al Mercado Negro.",
};

export const QUALITY_LABELS: Record<number, string> = {
  1: "Normal",
  2: "Buena",
  3: "Sobresaliente",
  4: "Excelente",
  5: "Obra maestra",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

export const TRAVEL_LABELS: Record<TravelKind, string> = {
  none: "Sin viaje",
  "royal-to-royal": "Transporte entre ciudades reales",
  "royal-to-caerleon": "Cruce de zona negra a Caerleon",
};

export const CATEGORY_LABELS: Record<string, string> = {
  armor: "Armadura",
  offhand: "Offhand",
  accessories: "Accesorios",
  gatherergear: "Equipo de recolección",
  tools: "Herramientas",
  melee: "Armas cuerpo a cuerpo",
  ranged: "Armas a distancia",
  magic: "Armas mágicas",
  mounts: "Monturas",
  resources: "Recursos",
  materials: "Materiales",
  products: "Productos",
  consumables: "Consumibles",
};

export const SUBCATEGORY_LABELS: Record<string, string> = {
  plate_helmet: "Casco de placas",
  plate_armor: "Armadura de placas",
  plate_shoes: "Botas de placas",
  leather_helmet: "Capucha de cuero",
  leather_armor: "Armadura de cuero",
  leather_shoes: "Botas de cuero",
  cloth_helmet: "Sombrero de tela",
  cloth_armor: "Túnica de tela",
  cloth_shoes: "Zapatos de tela",
  cape: "Capa",
  bag: "Bolsa",
  shield: "Escudo",
  book: "Libro",
  orb: "Orbe",
  totem: "Tótem",
  torch: "Antorcha",
  horn: "Cuerno",
  sword: "Espada",
  axe: "Hacha",
  mace: "Maza",
  hammer: "Martillo",
  dagger: "Daga",
  spear: "Lanza",
  quarterstaff: "Bastón largo",
  knuckles: "Nudillos",
  bow: "Arco",
  crossbow: "Ballesta",
  firestaff: "Bastón de fuego",
  froststaff: "Bastón de hielo",
  holystaff: "Bastón sagrado",
  arcanestaff: "Bastón arcano",
  naturestaff: "Bastón de naturaleza",
  cursestaff: "Bastón maldito",
  rune: "Runa",
  soul: "Alma",
  relic: "Reliquia",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function subcategoryLabel(subcategory: string): string {
  return SUBCATEGORY_LABELS[subcategory] ?? subcategory;
}

export function enchantLabel(level: number): string {
  return level === 0 ? "Sin encantar" : `.${level}`;
}

export function formatSilver(value: number): string {
  return Math.round(value).toLocaleString("es-ES");
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;
}

export function formatAge(ms: number): string {
  if (!Number.isFinite(ms)) return "sin datos";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}
