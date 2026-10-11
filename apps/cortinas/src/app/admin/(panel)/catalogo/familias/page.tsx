import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { familyFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const [rows, { attrOptions, attributes }, materials] = await Promise.all([
    getDb().select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder), asc(schema.productFamilies.id)),
    attributeData(),
    getDb().select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
  ]);
  return (
    <CrudManager resource="families" title="3 · Categorías" newLabel="Añadir categoría"
      description="Qué materiales y atributos admite cada categoría."
      fields={familyFields(attrOptions.map((a) => ({ id: a.id, name: a.name, values: a.values })), materials.map((m) => ({ value: m.slug, label: m.name })), {
        field: "materials", scoped: attributes.filter((a) => a.scope === "material").map((a) => a.id),
        materials: materials.map((m) => ({ slug: m.slug, name: m.name, attrs: m.attributes })),
      })} initialRows={rows} />
  );
}
