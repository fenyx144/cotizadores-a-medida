/** Sirve las fotos de los leads (solo para admins con sesión). */
import { getStorage } from "@portafolio/core/storage";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (!(await getSession())) return new Response("No autorizado", { status: 401 });
  const { key } = await ctx.params;
  const file = await getStorage().get(key.join("/"));
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(Buffer.from(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600" } });
}
