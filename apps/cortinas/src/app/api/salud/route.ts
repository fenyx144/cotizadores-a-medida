/** GET /api/salud — diagnóstico sin secretos (variables y base de datos). */
import { healthReport } from "@portafolio/core/health";
import { getCatalog } from "@/lib/catalog";
import { cleanupInfo, upgradeErrors } from "@/lib/accionamiento";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const report = await healthReport(["product_models", "fabrics", "frame_colors", "price_rules", "clients", "projects", "plans", "lines", "admin_users"]);
  await getCatalog().catch(() => null);
  const limpieza = new URL(req.url).searchParams.has("limpieza") ? cleanupInfo : undefined;
  return Response.json({ ...report, upgradeErrors, limpieza }, { status: report.ok ? 200 : 503 });
}
