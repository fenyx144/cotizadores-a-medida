import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import { ruleFields } from "@/lib/admin-fields";
import { optionChoices } from "@/lib/rules";
import { RulesStudio } from "@/components/admin/RulesStudio";

export default async function Page() {
  const db = getDb();
  const [catalog, constraints, rules] = await Promise.all([
    getCatalog(),
    db.select().from(schema.constraintRules).orderBy(asc(schema.constraintRules.id)),
    db.select().from(schema.priceRules).orderBy(asc(schema.priceRules.id)),
  ]);
  return (
    <div className="space-y-16">
      <RulesStudio catalog={catalog} initialRules={constraints} />
      <div data-testid="price-rules">
        <CrudManager resource="rules" title="Recargos generales" newLabel="Añadir recargo"
          description="Importes por tipo de producto o superficie (instalación, tubo reforzado)."
          fields={ruleFields(optionChoices(catalog))} initialRows={rules} />
      </div>
    </div>
  );
}
