import { Resend } from "resend";
import { logger } from "@/lib/logger";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? "UnkoApp <onboarding@resend.dev>";
const appUrl = (process.env.AUTH_URL ?? "https://unkoapp.com").replace(/\/$/, "");
const appName = "UnkoApp";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendInvitationEmail({
  to,
  invitedByName,
  tripName,
  expiresAt,
}: {
  to: string;
  invitedByName: string;
  tripName?: string | null;
  expiresAt: Date;
}) {
  if (!resend) {
    logger.info("resend.skipped", { reason: "RESEND_API_KEY not set", to });
    return;
  }

  const subject = tripName
    ? `${invitedByName} te invitó a "${tripName}" en ${appName}`
    : `${invitedByName} te invitó a ${appName}`;

  const expiryFormatted = expiresAt.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const signInUrl = `${appUrl}/api/auth/signin`;

  const tripLine = tripName
    ? `<p style="margin:0 0 8px">Te han invitado al viaje <strong>${escapeHtml(tripName)}</strong>. Cuando inicies sesión, te unirás automáticamente.</p>`
    : `<p style="margin:0 0 8px">Tienes acceso para unirte a ${appName} y empezar a planear viajes con tu grupo.</p>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

        <!-- Header -->
        <tr><td style="background:#18181b;border-radius:12px 12px 0 0;padding:28px 32px">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${appName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.3px">
            Te han invitado
          </h1>
          <p style="margin:0 0 8px;color:#52525b;font-size:15px;line-height:1.6">
            <strong style="color:#18181b">${escapeHtml(invitedByName)}</strong> te ha invitado a unirte a ${appName}.
          </p>
          <div style="color:#52525b;font-size:15px;line-height:1.6">
            ${tripLine}
          </div>

          <!-- CTA Button -->
          <div style="margin:28px 0">
            <a href="${signInUrl}"
               style="display:inline-block;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;letter-spacing:0.1px">
              Iniciar sesión con Google →
            </a>
          </div>

          <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5">
            Esta invitación es válida hasta el <strong style="color:#71717a">${expiryFormatted}</strong>.<br>
            Inicia sesión con la cuenta de Google asociada a este correo.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px">
          <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6">
            Recibiste este correo porque alguien te invitó a ${appName}.<br>
            Si no esperabas esta invitación, puedes ignorar este mensaje.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      logger.info("resend.error", { to, error: error.message });
    } else {
      logger.info("resend.sent", { to, subject });
    }
  } catch (err) {
    logger.info("resend.exception", { to, error: String(err) });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
