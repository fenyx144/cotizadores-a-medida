/** Sirve la imagen de un plano o foto (solo admin o cliente dueño del proyecto). */
import { eq } from "drizzle-orm";
import { getStorage } from "@portafolio/core/storage";
import { getDb, schema } from "@/lib/db";
import { canViewProject } from "@/lib/access";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [plan] = await getDb().select().from(schema.plans).where(eq(schema.plans.id, Number(id)));
  if (!plan || !(await canViewProject(plan.projectId))) return new Response("No encontrado", { status: 404 });
  const file = await getStorage().get(plan.imageKey);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(Buffer.from(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=86400" } });
}
