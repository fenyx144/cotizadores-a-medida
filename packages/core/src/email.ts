/**
 * Envío de emails con Resend (opcional).
 * Si no hay RESEND_API_KEY, el email se muestra en la consola del servidor:
 * así la demo funciona sin configurar nada.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) {
    console.log(`\n[email simulado] Para: ${msg.to}\nAsunto: ${msg.subject}\n${msg.html.replace(/<[^>]+>/g, " ")}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html }),
  });
  // Un fallo de email no debe romper la solicitud del cliente: solo lo registramos.
  if (!res.ok) console.error("[email] Error de Resend:", res.status, await res.text());
}
