import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { getDb, schema } from "@/lib/db";
import { variantFields } from "@/lib/admin-fields";

export default async function Page({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const db = getDb();
  const modelId = Number(producto) || null;
  const [rows, models, fabrics, frames] = await Promise.all([
    db.select().from(schema.productVariants).where(modelId ? eq(schema.productVariants.modelId, modelId) : undefined).orderBy(asc(schema.productVariants.modelId), asc(schema.productVariants.sortOrder), asc(schema.productVariants.id)),
    db.select().from(schema.productModels).orderBy(asc(schema.productModels.sortOrder)),
    db.select().from(schema.fabrics).orderBy(asc(schema.fabrics.sortOrder)),
    db.select().from(schema.frameColors).orderBy(asc(schema.frameColors.sortOrder)),
  ]);
  const fields = variantFields(
    models.map((m) => ({ value: String(m.id), label: m.name })),
    fabrics.map((f) => ({ value: String(f.id), label: `${f.name} (${f.code})` })),
    frames.map((f) => ({ value: String(f.id), label: `${f.name}${f.ral ? ` RAL ${f.ral}` : ""}` })),
  );
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Filtrar por producto">
        <Link href="/admin/catalogo/variantes" className={!modelId ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>Todos</Link>
        {models.map((m) => (
          <Link key={m.id} href={`/admin/catalogo/variantes?producto=${m.id}`} className={modelId === m.id ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>{m.name}</Link>
        ))}
      </nav>
      <CrudManager key={modelId ?? 0} resource="variants" title="Variantes" newLabel="Añadir variante"
        description="Código de artículo por combinación de tela y color de perfil. Vacío = cualquiera."
        fields={fields} initialRows={rows} />
    </div>
  );
}
