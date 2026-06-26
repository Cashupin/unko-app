import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/health ────────────────────────────────────────────────────────
// Touches the database so Supabase doesn't pause the project for inactivity.
// Hit on a schedule by the Vercel Cron Job configured in vercel.json.

const PREVIEW_HEALTH_URL = "https://codedevs.cl/api/health";

export async function GET() {
  try {
    await prisma.trip.count();
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Only Production pings Preview — never the other way around, or both
  // environments would keep pinging each other in an infinite loop.
  if (process.env.VERCEL_ENV === "production") {
    fetch(PREVIEW_HEALTH_URL).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
