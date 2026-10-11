/** Sirve un adjunto del proyecto (solo admin o cliente dueño). ?descargar=1 fuerza la descarga. */
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { canViewProject } from "@/lib/access";
import { getFile } from "@/lib/files";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [a] = await getDb().select().from(schema.projectAttachments).where(eq(schema.projectAttachments.id, Number(id)));
  if (!a || !(await canViewProject(a.projectId))) return new Response("No encontrado", { status: 404 });
  const url = new URL(req.url);
  const file = await getFile(a.storageKey, url.origin);
  if (!file) return new Response("No encontrado", { status: 404 });
  const disposition = `${url.searchParams.has("descargar") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(a.name)}`;
  return new Response(Buffer.from(file.body), { headers: { "Content-Type": a.contentType, "Content-Disposition": disposition, "Cache-Control": "private, max-age=3600" } });
}
