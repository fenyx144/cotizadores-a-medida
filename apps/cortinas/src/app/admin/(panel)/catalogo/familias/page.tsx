import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { familyFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const [rows, { attrOptions }] = await Promise.all([
    getDb().select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder), asc(schema.productFamilies.id)),
    attributeData(),
  ]);
  return (
    <CrudManager resource="families" title="3 · Categorías" newLabel="Añadir categoría"
      description="Qué atributos pide cada categoría; sus productos los heredan."
      fields={familyFields(attrOptions.map(({ defaultOn: _d, note: _n, ...a }) => a))} initialRows={rows} />
  );
}
