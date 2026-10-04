import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { MODEL_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.productModels).orderBy(asc(schema.productModels.id));
  return <CrudManager resource="models" title="Modelos" description="Medidas mínimas y máximas y precio base por modelo." fields={MODEL_FIELDS} initialRows={rows} newLabel="Añadir modelo" />;
}
