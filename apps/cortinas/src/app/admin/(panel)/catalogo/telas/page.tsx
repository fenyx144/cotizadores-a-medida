import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { FABRIC_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.fabrics).orderBy(asc(schema.fabrics.id));
  return <CrudManager resource="fabrics" title="Telas" description="Colecciones, colores y suplementos." fields={FABRIC_FIELDS} initialRows={rows} newLabel="Añadir tela" />;
}
