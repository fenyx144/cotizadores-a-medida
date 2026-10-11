import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { constraintFields, ruleFields } from "@/lib/admin-fields";
import { optionChoices } from "@/lib/rules";

export default async function Page() {
  const db = getDb();
  const [constraints, rules, models, fabrics, frames, families, materials] = await Promise.all([
    db.select().from(schema.constraintRules).orderBy(asc(schema.constraintRules.id)),
    db.select().from(schema.priceRules).orderBy(asc(schema.priceRules.id)),
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.sortOrder)),
    db.select().from(schema.fabrics).orderBy(asc(schema.fabrics.sortOrder)),
    db.select().from(schema.frameColors).orderBy(asc(schema.frameColors.sortOrder)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
  ]);
  const options = optionChoices({ models, fabrics, frames, families, materials });
  const fam = families.map((f) => ({ value: String(f.id), label: f.name }));
  const mod = models.map((m) => ({ value: String(m.id), label: m.name }));
  return (
    <div className="space-y-16">
      <div data-testid="constraint-rules">
        <CrudManager resource="constraints" title="Reglas del configurador" newLabel="Añadir regla"
          description="Combinaciones no permitidas y límites de medidas."
          fields={constraintFields(fam, mod, options)} initialRows={constraints} />
      </div>
      <div data-testid="price-rules">
        <CrudManager resource="rules" title="Recargos" newLabel="Añadir recargo"
          description="Importes fijos, por m² o porcentaje."
          fields={ruleFields(options)} initialRows={rules} />
      </div>
    </div>
  );
}
