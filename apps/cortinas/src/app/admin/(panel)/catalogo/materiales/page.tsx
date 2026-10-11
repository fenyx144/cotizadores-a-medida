import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { materialFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const [mats, { attrOptions }, families] = await Promise.all([
    getDb().select().from(schema.materials).orderBy(asc(schema.materials.sortOrder), asc(schema.materials.id)),
    attributeData(),
    getDb().select({ name: schema.productFamilies.name, materials: schema.productFamilies.materials }).from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
  ]);
  // Categorías que usan cada material (solo lectura).
  const rows = mats.map((m) => ({ ...m, usedBy: families.filter((f) => f.materials.split(",").includes(m.slug)).map((f) => f.name).join(", ") || "—" }));
  return (
    <CrudManager resource="materials" title="2 · Materiales" newLabel="Añadir material"
      description="Cada material decide qué atributos y valores admite."
      fields={materialFields(attrOptions)} initialRows={rows} />
  );
}
