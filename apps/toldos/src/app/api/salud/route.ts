/** GET /api/salud — diagnóstico sin secretos (variables y base de datos). */
import { healthReport } from "@portafolio/core/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await healthReport(["product_models", "fabrics", "frame_colors", "price_rules", "service_zones", "leads", "lead_photos", "admin_users"]);
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
