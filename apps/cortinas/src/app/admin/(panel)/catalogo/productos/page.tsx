import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { productFields } from "@/lib/admin-fields";
import { attributeData, attrsByFamily } from "@/lib/admin-catalog";

export default async function Page() {
  const db = getDb();
  const [rows, families, materials, { attrOptions, attributes }] = await Promise.all([
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.id)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
    attributeData(),
  ]);
  // Por categoría: los atributos que activa (genéricos y por material). Los valores los elige el producto.
  const attrsBy = { field: "familyId", map: attrsByFamily(families, attrOptions) };
  const materialLinks = { field: "materials", scoped: attributes.filter((a) => a.scope === "material").map((a) => a.id), materials: materials.map((m) => ({ slug: m.slug, name: m.name, attrs: m.attributes })) };
  const fields = productFields(families.map((f) => ({ value: String(f.id), label: f.name })), materials.map((m) => ({ value: m.slug, label: m.name })),
    Object.fromEntries(families.map((f) => [String(f.id), f.materials.split(",").filter(Boolean)])), attrsBy, materialLinks);
  return <CrudManager resource="products" title="4 · Productos" fields={fields} initialRows={rows} newLabel="Añadir producto" />;
}
