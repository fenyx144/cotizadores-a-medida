import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { productFields } from "@/lib/admin-fields";

export default async function Page() {
  const db = getDb();
  const [rows, families] = await Promise.all([
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.id)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
  ]);
  const fields = productFields(families.map((f) => ({ value: String(f.id), label: f.name })));
  return <CrudManager resource="products" title="Productos" description="Cada producto pertenece a una familia (plantilla). Medidas, precios y ficha técnica." fields={fields} initialRows={rows} newLabel="Añadir producto" />;
}
