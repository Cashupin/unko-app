export type ExpenseCategory = "FOOD" | "TRANSPORT" | "ACCOMMODATION" | "ACTIVITY" | "OTHER";

export const CATEGORY_CONFIG: Record<ExpenseCategory, { emoji: string; label: string }> = {
  FOOD:          { emoji: "🍜", label: "Comida" },
  TRANSPORT:     { emoji: "🚇", label: "Transporte" },
  ACCOMMODATION: { emoji: "🏨", label: "Alojamiento" },
  ACTIVITY:      { emoji: "🎡", label: "Actividad" },
  OTHER:         { emoji: "💸", label: "Otros" },
};

const KEYWORDS: Record<ExpenseCategory, string[]> = {
  FOOD: [
    "cena","almuerzo","desayuno","comida","restaurante","café","cafe","bar","sushi",
    "pizza","hamburgesa","asado","parrilla","brunch","ramen","gyoza","buffet",
    "food","restaurant","lunch","dinner","breakfast","izakaya","cocina",
  ],
  TRANSPORT: [
    "taxi","uber","metro","tren","bus","avión","avion","vuelo","ferry","barcaza",
    "transfer","colectivo","transporte","auto","rent","shuttle","tuk","mototaxi",
    "shinkansen","subway","train","flight","brt","funicular",
  ],
  ACCOMMODATION: [
    "hotel","hostel","airbnb","alojamiento","habitación","habitacion","cuarto","room",
    "motel","cabaña","cabana","departamento","apart","lodge","ryokan","inn","hostal",
  ],
  ACTIVITY: [
    "tour","museo","entrada","actividad","parque","concierto","show","teatro",
    "excursión","excursion","ticket","boleto","paseo","visita","clase","taller",
    "rafting","kayak","snorkel","senderismo","safari","zipline","escape","juego",
  ],
  OTHER: [],
};

export function detectCategory(description: string): ExpenseCategory {
  const lower = description.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS) as [ExpenseCategory, string[]][]) {
    if (cat === "OTHER") continue;
    if (words.some((w) => lower.includes(w))) return cat;
  }
  return "OTHER";
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_CONFIG[category as ExpenseCategory]?.emoji ?? "💸";
}
