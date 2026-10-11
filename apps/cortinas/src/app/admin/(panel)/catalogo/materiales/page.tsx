import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { materialFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const [rows, { attrOptions }] = await Promise.all([
    getDb().select().from(schema.materials).orderBy(asc(schema.materials.sortOrder), asc(schema.materials.id)),
    attributeData(),
  ]);
  return (
    <CrudManager resource="materials" title="2 · Materiales" newLabel="Añadir material"
      description="Cada material decide qué atributos y valores admite."
      fields={materialFields(attrOptions)} initialRows={rows} />
  );
}
