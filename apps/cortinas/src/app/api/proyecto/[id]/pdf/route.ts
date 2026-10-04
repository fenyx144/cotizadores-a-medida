/** PDF del proyecto: plano con anotaciones numeradas + tabla de líneas. */
import { canViewProject } from "@/lib/access";
import { loadProject } from "@/lib/project";
import { projectPdf } from "@/lib/exports";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!(await canViewProject(id))) return new Response("No autorizado", { status: 401 });
  const data = await loadProject(id);
  if (!data) return new Response("No encontrado", { status: 404 });
  const pdf = await projectPdf(data);
  return new Response(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${data.project.reference}.pdf"` },
  });
}
