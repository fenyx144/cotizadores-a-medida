import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { FRAME_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.frameColors).orderBy(asc(schema.frameColors.id));
  return <CrudManager resource="frames" title="Perfiles" description="Color del tubo, cabezal y contrapeso." fields={FRAME_FIELDS} initialRows={rows} newLabel="Añadir perfil" />;
}
