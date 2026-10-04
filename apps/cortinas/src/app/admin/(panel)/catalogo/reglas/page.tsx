import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { RULE_FIELDS } from "@/lib/admin-fields";

export default async function Page() {
  const rows = await getDb().select().from(schema.priceRules).orderBy(asc(schema.priceRules.id));
  return <CrudManager resource="rules" title="Reglas de precio" description="Motores, instalación y recargos. Se aplican en el configurador y en los proyectos." fields={RULE_FIELDS} initialRows={rows} newLabel="Añadir regla" />;
}
