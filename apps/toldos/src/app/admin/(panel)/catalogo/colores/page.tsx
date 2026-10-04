import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { FRAME_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.frameColors).orderBy(asc(schema.frameColors.id));
  return <CrudManager resource="frames" title="Colores de estructura" description="Acabados del aluminio y su suplemento." fields={FRAME_FIELDS} initialRows={rows} newLabel="Añadir color" />;
}
