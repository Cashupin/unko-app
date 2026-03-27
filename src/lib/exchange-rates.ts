type Rates = Record<string, number>;

let cachedRates: Rates | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetches exchange rates (base: USD) from the external API.
 * Caches in-memory for 1 hour on the server.
 */
export async function getExchangeRates(): Promise<Rates> {
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedRates;
  }

  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error("Failed to fetch exchange rates");

  const data = (await res.json()) as { result: string; rates: Record<string, number> };
  if (data.result !== "success") throw new Error("Exchange rate API error");

  cachedRates = data.rates;
  cachedRates.USD = 1;
  cacheTimestamp = Date.now();
  return cachedRates;
}

/**
 * Convert an amount from one currency to another using USD as pivot.
 */
export function convertAmount(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}
