import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { ZONE_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.serviceZones).orderBy(asc(schema.serviceZones.id));
  return <CrudManager resource="zones" title="Zonas de servicio" description="Distritos donde hacemos visitas de medición." fields={ZONE_FIELDS} initialRows={rows} newLabel="Añadir distrito" />;
}
