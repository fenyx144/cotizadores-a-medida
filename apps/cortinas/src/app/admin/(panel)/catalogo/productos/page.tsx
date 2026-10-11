import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { productFields } from "@/lib/admin-fields";

export default async function Page() {
  const db = getDb();
  const [rows, families, materials] = await Promise.all([
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.id)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
  ]);
  const fields = productFields(families.map((f) => ({ value: String(f.id), label: f.name })), materials.map((m) => ({ value: m.slug, label: m.name })),
    Object.fromEntries(families.map((f) => [String(f.id), f.materials.split(",").filter(Boolean)])));
  return <CrudManager resource="products" title="4 · Productos" description="Fotos, categoría, medidas y ficha técnica." fields={fields} initialRows={rows} newLabel="Añadir producto" />;
}
