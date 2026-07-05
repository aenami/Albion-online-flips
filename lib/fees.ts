// Albion Online marketplace fee mechanics.
// Setup fee: paid up front whenever a resting buy/sell order is placed.
// Sales tax: charged to the seller whenever an order is fulfilled.
// Instant-buy / instant-sell (matching an existing order immediately) never
// pays the setup fee, only the seller-side sales tax applies.
// The Black Market is an NPC and is exempt from both fees entirely.

export const SETUP_FEE_RATE = 0.025;

export function salesTaxRate(hasPremium: boolean): number {
  return hasPremium ? 0.04 : 0.08;
}

export interface FeeSettings {
  hasPremium: boolean;
}

/** Net proceeds from selling via a resting sell order (setup fee + tax). */
export function netFromSellOrder(price: number, fees: FeeSettings): number {
  return price * (1 - SETUP_FEE_RATE - salesTaxRate(fees.hasPremium));
}

/** Net proceeds from instant-selling into an existing buy order (tax only). */
export function netFromInstantSell(price: number, fees: FeeSettings): number {
  return price * (1 - salesTaxRate(fees.hasPremium));
}

/** Total cost of placing a resting buy order (setup fee, no tax). */
export function costOfBuyOrder(price: number): number {
  return price * (1 + SETUP_FEE_RATE);
}

/** Total cost of instant-buying from an existing sell order (no fees at all). */
export function costOfInstantBuy(price: number): number {
  return price;
}

/** Black Market NPC buy orders: tax-free and fee-free for the seller. */
export function netFromBlackMarketSale(price: number): number {
  return price;
}
