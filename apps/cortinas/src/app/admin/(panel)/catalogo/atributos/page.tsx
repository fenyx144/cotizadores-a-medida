import Link from "next/link";
import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { ATTRIBUTE_FIELDS, valueFields } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page({ searchParams }: { searchParams: Promise<{ atributo?: string }> }) {
  const { atributo } = await searchParams;
  const { attributes, values } = await attributeData();
  const current = attributes.find((a) => a.id === Number(atributo)) ?? attributes[0];
  const rows = values.filter((v) => v.attributeId === current?.id);
  const tab = (on: boolean) => (on ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink");
  return (
    <div className="space-y-14">
      <CrudManager resource="attributes" title="1 · Atributos" newLabel="Añadir atributo"
        description="Genéricos para todos, o según material. Cada uno con sus valores."
        fields={ATTRIBUTE_FIELDS} initialRows={attributes} />
      {current && (
        <div data-testid="attribute-values">
          <nav className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Atributo">
            {attributes.map((a) => <Link key={a.id} href={`/admin/catalogo/atributos?atributo=${a.id}`} className={tab(a.id === current.id)}>{a.name}</Link>)}
          </nav>
          <CrudManager key={current.id} resource="values" title={`Valores de “${current.name}”`} newLabel="Añadir valor"
            description={current.kind === "sino" ? "Un solo valor (“Sí”) con su recargo." : current.kind === "numero" ? "El cliente escribe un número; no lleva valores." : "Cada valor puede tener código, muestra y recargo."}
            fields={valueFields(attributes.map((a) => ({ value: String(a.id), label: a.name }))).map((f) => (f.name === "attributeId" ? { ...f, options: [{ value: String(current.id), label: current.name }, ...(f.options ?? []).filter((o) => o.value !== String(current.id))] } : f))}
            initialRows={rows} />
        </div>
      )}
    </div>
  );
}
