import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { variantFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const db = getDb();
  const modelId = Number(producto) || null;
  const [rows, models, { valueOptions }, materials] = await Promise.all([
    db.select().from(schema.productVariants).where(modelId ? eq(schema.productVariants.modelId, modelId) : undefined).orderBy(asc(schema.productVariants.modelId), asc(schema.productVariants.sortOrder), asc(schema.productVariants.id)),
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.sortOrder)),
    attributeData(),
    db.select().from(schema.materials).orderBy(asc(schema.materials.sortOrder)),
  ]);
  const fields = variantFields(models.map((m) => ({ value: String(m.id), label: m.name })), valueOptions, materials.map((m) => ({ value: m.slug, label: m.name })));
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
