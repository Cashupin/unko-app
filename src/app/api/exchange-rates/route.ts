import { NextResponse } from "next/server";

// Revalidate once per day — Next.js caches the fetch result
export const revalidate = 86400;

const CURRENCIES = ["CLP", "JPY", "EUR", "GBP", "KRW", "CNY", "THB"];

export async function GET() {
  try {
    // open.er-api.com: free, no API key, supports 160+ currencies (CLP, KRW, THB included)
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch rates" }, { status: 502 });
    }

    const data = (await res.json()) as {
      result: string;
      base_code: string;
      time_last_update_utc: string;
      rates: Record<string, number>;
    };

    if (data.result !== "success") {
      return NextResponse.json({ error: "API error" }, { status: 502 });
    }

    // Keep only the currencies the app uses
    const rates: Record<string, number> = { USD: 1 };
    for (const c of CURRENCIES) {
      if (data.rates[c] != null) rates[c] = data.rates[c];
    }

    return NextResponse.json({ base: "USD", date: data.time_last_update_utc, rates });
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
