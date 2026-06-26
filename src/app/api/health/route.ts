import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/health ────────────────────────────────────────────────────────
// Touches the database so Supabase doesn't pause the project for inactivity.
// Hit on a schedule by the Vercel Cron Job configured in vercel.json.

export async function GET() {
  try {
    await prisma.trip.count();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
