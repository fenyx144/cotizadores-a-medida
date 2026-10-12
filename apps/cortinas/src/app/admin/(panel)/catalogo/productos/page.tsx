import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { productFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const db = getDb();
  const [rows, families, materials, { attrOptions }] = await Promise.all([
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.id)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
    attributeData(),
  ]);
  // Por categoría: sus atributos y valores permitidos; el producto puede acotarlos más.
  const attrsBy = { field: "familyId", map: Object.fromEntries(families.map((f) => {
    const conf = f.attributes?.length ? f.attributes.filter((e) => e.valueIds[0] !== -1) : attrOptions.map((a) => ({ attributeId: a.id, required: false, valueIds: [] as number[] }));
    return [String(f.id), conf.map((e) => attrOptions.find((a) => a.id === e.attributeId)).filter((a) => !!a).map((a) => {
      const allowed = conf.find((e) => e.attributeId === a!.id)!.valueIds;
      return { id: a!.id, name: a!.name, defaultOn: true, values: allowed.length ? a!.values.filter((v) => allowed.includes(v.id)) : a!.values };
    })];
  })) };
  const fields = productFields(families.map((f) => ({ value: String(f.id), label: f.name })), materials.map((m) => ({ value: m.slug, label: m.name })),
    Object.fromEntries(families.map((f) => [String(f.id), f.materials.split(",").filter(Boolean)])), attrsBy);
  return <CrudManager resource="products" title="4 · Productos" fields={fields} initialRows={rows} newLabel="Añadir producto" />;
}
