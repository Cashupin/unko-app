/**
 * Publishes a broadcast event to a Supabase Realtime channel from the server.
 * Uses the service role key — never exposed to the browser.
 * Fire-and-forget: errors are silenced so they never block the response.
 */
export function broadcast(
  topic: string,
  event: string,
  payload: Record<string, unknown> = {},
) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ messages: [{ topic, event, payload }] }),
  }).catch(() => {});
}
