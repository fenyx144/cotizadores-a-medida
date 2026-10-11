import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { MATERIAL_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.materials).orderBy(asc(schema.materials.sortOrder), asc(schema.materials.id));
  return <CrudManager resource="materials" title="Materiales" description="Se usan en los productos, los filtros del catálogo y las reglas." fields={MATERIAL_FIELDS} initialRows={rows} newLabel="Añadir material" />;
}
