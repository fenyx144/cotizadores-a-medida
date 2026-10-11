import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { familyFields } from "@/lib/admin-fields";

export default async function Page() {
  const db = getDb();
  const [rows, frames, fabrics] = await Promise.all([
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder), asc(schema.productFamilies.id)),
    db.select().from(schema.frameColors).orderBy(asc(schema.frameColors.sortOrder)),
    db.select().from(schema.fabrics).orderBy(asc(schema.fabrics.sortOrder)),
  ]);
  const fields = familyFields(
    frames.map((f) => ({ value: String(f.id), label: `${f.name}${f.ral ? ` RAL ${f.ral}` : ""}` })),
    fabrics.map((f) => ({ value: String(f.id), label: `${f.name} (${f.code})` })),
  );
  return (
    <CrudManager resource="families" title="Categorías / Familias" newLabel="Añadir categoría"
      description="Agrupan el catálogo y definen qué opciones y medidas admite cada producto."
      fields={fields} initialRows={rows} />
  );
}
