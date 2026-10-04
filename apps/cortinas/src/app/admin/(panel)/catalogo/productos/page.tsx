import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { PRODUCT_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.productModels).orderBy(asc(schema.productModels.id));
  return <CrudManager resource="products" title="Productos" description="Medidas mínimas y máximas, precios base y por m²." fields={PRODUCT_FIELDS} initialRows={rows} newLabel="Añadir producto" />;
}
