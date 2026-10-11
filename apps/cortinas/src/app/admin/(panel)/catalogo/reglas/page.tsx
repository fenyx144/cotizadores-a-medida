import { asc } from "drizzle-orm";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { constraintFields, ruleFields } from "@/lib/admin-fields";
import { optionChoices } from "@/lib/rules";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const db = getDb();
  const [constraints, rules, models, families, materials, { attributes, values }] = await Promise.all([
    db.select().from(schema.constraintRules).orderBy(asc(schema.constraintRules.id)),
    db.select().from(schema.priceRules).orderBy(asc(schema.priceRules.id)),
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.sortOrder)),
    db.select().from(schema.productFamilies).orderBy(asc(schema.productFamilies.sortOrder)),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
    attributeData(),
  ]);
  const options = optionChoices({ models, attributes, values, families, materials });
  const fam = families.map((f) => ({ value: String(f.id), label: f.name }));
  const mod = models.map((m) => ({ value: String(m.id), label: m.name }));
  return (
    <div className="space-y-16">
      <div data-testid="constraint-rules">
        <CrudManager resource="constraints" title="5 · Reglas" newLabel="Añadir regla"
          description="Combinaciones no permitidas y límites de medidas según lo elegido."
          fields={constraintFields(fam, mod, options)} initialRows={constraints} />
      </div>
      <div data-testid="price-rules">
        <CrudManager resource="rules" title="Recargos" newLabel="Añadir recargo"
          description="Importes extra condicionados a un valor, tipo o superficie."
          fields={ruleFields(options)} initialRows={rules} />
      </div>
    </div>
  );
}
