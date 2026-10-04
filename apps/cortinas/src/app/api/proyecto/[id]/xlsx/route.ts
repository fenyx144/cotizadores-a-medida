/** Excel del proyecto (líneas + resumen por ubicación). */
import { canViewProject } from "@/lib/access";
import { loadProject } from "@/lib/project";
import { projectXlsx } from "@/lib/exports";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!(await canViewProject(id))) return new Response("No autorizado", { status: 401 });
  const data = await loadProject(id);
  if (!data) return new Response("No encontrado", { status: 404 });
  const xlsx = await projectXlsx(data);
  return new Response(Buffer.from(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${data.project.reference}.xlsx"`,
    },
  });
}
