/** GET /api/zonas?cp=1234AB -> { zone: "Amsterdam" | null } */
import { findZone } from "@portafolio/core/validation";
import { getZones } from "@/lib/catalog";

export async function GET(req: Request) {
  const cp = new URL(req.url).searchParams.get("cp") ?? "";
  const zone = findZone(cp, await getZones());
  return Response.json({ zone: zone?.name ?? null });
}
