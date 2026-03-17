import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

type GeminiResponse = {
  candidates?: { content: { parts: { text: string }[] } }[];
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI no configurado" }, { status: 503 });
  }

  const { imageUrl } = (await req.json()) as { imageUrl?: string };
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl requerido" }, { status: 400 });
  }

  // Fetch image and encode as base64
  let base64: string;
  let mimeType: string;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("fetch failed");
    mimeType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imgRes.arrayBuffer();
    base64 = Buffer.from(buffer).toString("base64");
  } catch {
    return NextResponse.json({ error: "No se pudo obtener la imagen" }, { status: 400 });
  }

  const prompt = `Analyze this receipt/bill image and extract all line items.
Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "items": [
    { "description": "item name", "amount": 1234, "qty": 2 }
  ],
  "currency": "CLP"
}
Rules:
- amount: the total price for that line (number, no formatting)
- qty: the quantity shown for that line (integer, minimum 1)
- description: concise product name only, no quantity prefix, max 50 chars
- currency: ISO 4217 code if visible (CLP, USD, EUR, JPY, etc.), otherwise "CLP"
- do NOT include subtotal, total, tip, or propina rows
- if you cannot read the receipt clearly, return { "items": [], "currency": "CLP" }`;

  let geminiData: GeminiResponse;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "Error al llamar a la IA" }, { status: 502 });
    }

    geminiData = (await geminiRes.json()) as GeminiResponse;
  } catch {
    return NextResponse.json({ error: "Error de red con la IA" }, { status: 502 });
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    const parsed = JSON.parse(text) as {
      items: { description: string; amount: number }[];
      currency?: string;
    };
    return NextResponse.json({
      items: parsed.items ?? [],
      currency: parsed.currency ?? "CLP",
    });
  } catch {
    return NextResponse.json({ error: "La IA devolvió un formato inesperado" }, { status: 502 });
  }
}
