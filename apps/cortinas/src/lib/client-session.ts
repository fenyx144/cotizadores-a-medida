/**
 * Sesión de clientes (área de cliente y "Mi proyecto").
 * Usa la misma firma JWT que el admin pero con rol "client" y otra cookie,
 * así un token de cliente nunca abre el panel interno.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENT_COOKIE, verifySessionToken } from "@portafolio/core/auth";

export async function getClientSession() {
  const store = await cookies();
  return verifySessionToken(store.get(CLIENT_COOKIE)?.value, "client");
}

export async function requireClient(next = "/cliente") {
  const session = await getClientSession();
  if (!session) redirect(`/cliente/ingresar?next=${encodeURIComponent(next)}`);
  return session;
}
