export const CURRENCIES = ["CLP", "JPY", "USD", "EUR", "GBP", "KRW", "CNY", "THB"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CLP: "$", JPY: "¥", USD: "$", EUR: "€", GBP: "£", KRW: "₩", CNY: "¥", THB: "฿",
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  CLP: "Peso Chileno",
  JPY: "Yen Japonés",
  USD: "Dólar Americano",
  EUR: "Euro",
  GBP: "Libra Esterlina",
  KRW: "Won Coreano",
  CNY: "Yuan Chino",
  THB: "Baht Tailandés",
};

/** Número de decimales por moneda (0 = sin centavos) */
export const CURRENCY_DECIMALS: Record<Currency, number> = {
  CLP: 0, JPY: 0, KRW: 0,
  USD: 2, EUR: 2, GBP: 2, CNY: 2, THB: 2,
};

/** Formatea un monto con los decimales correctos según la moneda */
export function fmtAmount(amount: number, currency: string): string {
  const decimals = CURRENCY_DECIMALS[currency as Currency] ?? 2;
  return amount.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c,
  label: `${c} — ${CURRENCY_NAMES[c]}`,
}));
