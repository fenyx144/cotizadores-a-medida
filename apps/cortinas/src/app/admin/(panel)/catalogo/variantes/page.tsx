import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { skuPart, skuPrefix, variantFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";
import { getCatalog } from "@/lib/catalog";
import { evaluate } from "@/lib/rules";

export default async function Page({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const db = getDb();
  const modelId = Number(producto) || null;
  const [rows, models, { valueOptions, attrOptions }, materials, attrs, vals, catalog] = await Promise.all([
    db.select().from(schema.productVariants).where(modelId ? eq(schema.productVariants.modelId, modelId) : undefined).orderBy(asc(schema.productVariants.modelId), asc(schema.productVariants.sortOrder), asc(schema.productVariants.id)),
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.sortOrder)),
    attributeData(),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
    db.select().from(schema.attributes),
    db.select().from(schema.attributeValues),
    getCatalog(),
  ]);
  const aOrder = new Map(attrs.map((a) => [a.id, a.sortOrder]));
  const autoCode = {
    prefix: { field: "modelId", map: Object.fromEntries(models.map((m) => [String(m.id), skuPrefix(m.slug)])) },
    parts: { field: "valueIds", map: Object.fromEntries(vals.map((v) => [String(v.id), { code: skuPart(v), attr: v.attributeId, order: (aOrder.get(v.attributeId) ?? 0) * 1000 + v.sortOrder }])) },
  };
  // Combinación: solo atributos y valores que el producto admite (materiales + categoría + reglas sin elegir nada).
  const combo = { field: "modelId", map: Object.fromEntries(models.map((m) => {
    const ok = catalog.models.some((x) => x.id === m.id);
    const list = ok ? evaluate({ ...catalog, constraints: [] }, { modelId: m.id }).fields.filter((f) => f.kind === "lista" && f.choices.length)
      .map((f) => ({ id: f.attribute.id, name: f.attribute.name, values: f.choices.map((c) => ({ id: c.value as number, name: c.label })) })) : attrOptions;
    return [String(m.id), list];
  })) };
  const fields = variantFields(models.map((m) => ({ value: String(m.id), label: m.name })), valueOptions, materials.map((m) => ({ value: m.slug, label: m.name })), autoCode, combo);
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Filtrar por producto">
        <Link href="/admin/catalogo/variantes" className={!modelId ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>Todos</Link>
        {models.map((m) => (
          <Link key={m.id} href={`/admin/catalogo/variantes?producto=${m.id}`} className={modelId === m.id ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>{m.name}</Link>
        ))}
      </nav>
      <CrudManager key={modelId ?? 0} resource="variants" title="5 · Variantes" newLabel="Añadir variante"
        description="Código propio (SKU) para una combinación de valores."
        fields={fields} initialRows={rows} />
    </div>
  );
}
