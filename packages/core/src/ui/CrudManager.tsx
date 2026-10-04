"use client";
/**
 * Gestor CRUD genérico del panel: tabla + formulario lateral.
 * Se configura con una lista de campos; habla con /api/admin/<recurso>.
 * Ejemplo de uso en la app: <CrudManager resource="fabrics" fields={[...]} ... />
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export type FieldType = "text" | "textarea" | "number" | "color" | "boolean" | "select";

export interface CrudField {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  /** Si es true, un valor vacío se guarda como null. */
  nullable?: boolean;
  step?: number;
  hint?: string;
  /** Mostrar en la tabla. */
  column?: boolean;
}

type Row = Record<string, unknown> & { id: number };

export function CrudManager({
  resource,
  title,
  description,
  fields,
  initialRows,
  newLabel = "Añadir",
}: {
  resource: string;
  title: string;
  description?: string;
  fields: CrudField[];
  initialRows: Row[];
  newLabel?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const columns = fields.filter((f) => f.column);

  function emptyRow(): Partial<Row> {
    const r: Record<string, unknown> = {};
    for (const f of fields) r[f.name] = f.type === "boolean" ? true : f.type === "number" ? (f.nullable ? null : 0) : f.type === "color" ? "#cccccc" : f.nullable ? null : (f.options?.[0]?.value ?? "");
    return r;
  }

  /** Convierte los valores del formulario a los tipos que espera la API. */
  function toPayload(row: Partial<Row>) {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      let v = row[f.name];
      if (f.type === "number") v = v === "" || v === null || v === undefined ? (f.nullable ? null : 0) : Number(v);
      else if (f.type !== "boolean" && f.nullable && (v === "" || v === undefined)) v = null;
      out[f.name] = v;
    }
    return out;
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setErrors({});
    const isNew = !editing.id;
    const res = await fetch(`/api/admin/${resource}${isNew ? "" : `/${editing.id}`}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(editing)),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErrors(data.fields ?? { _: data.error ?? "Error al guardar" });
      return;
    }
    setRows((prev) => (isNew ? [...prev, data] : prev.map((r) => (r.id === data.id ? data : r))));
    setEditing(null);
    router.refresh();
  }

  async function remove(row: Row) {
    if (!confirm("¿Eliminar este registro? No se puede deshacer.")) return;
    const res = await fetch(`/api/admin/${resource}/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (editing?.id === row.id) setEditing(null);
      router.refresh();
    } else alert("No se pudo eliminar (puede estar en uso).");
  }

  function display(f: CrudField, value: unknown) {
    if (f.type === "boolean") return value ? "Sí" : "No";
    if (f.type === "color")
      return (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full border border-line" style={{ background: String(value) }} />
          <span className="text-muted">{String(value)}</span>
        </span>
      );
    if (f.type === "select") return f.options?.find((o) => o.value === value)?.label ?? (value == null ? "—" : String(value));
    return value == null || value === "" ? "—" : String(value);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-serif text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <button onClick={() => { setErrors({}); setEditing(emptyRow()); }} className="bg-ink px-4 py-2 text-sm text-paper hover:bg-ink/85">
          {newLabel}
        </button>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                {columns.map((c) => (
                  <th key={c.name} className="py-2 pr-4 font-normal">{c.label}</th>
                ))}
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={`border-b border-line/70 ${editing?.id === row.id ? "bg-ink/[0.03]" : ""}`}>
                  {columns.map((c) => (
                    <td key={c.name} className="py-3 pr-4">{display(c, row[c.name])}</td>
                  ))}
                  <td className="whitespace-nowrap py-3 text-right">
                    <button onClick={() => { setErrors({}); setEditing({ ...row }); }} className="text-ink underline underline-offset-4">Editar</button>
                    <button onClick={() => remove(row)} className="ml-4 text-muted hover:text-danger">Eliminar</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="py-6 text-muted" colSpan={columns.length + 1}>Todavía no hay registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {editing && (
          <form
            onSubmit={(e) => { e.preventDefault(); save(); }}
            className="space-y-4 self-start border-t border-ink pt-4 lg:sticky lg:top-8"
          >
            <p className="font-serif text-xl">{editing.id ? "Editar" : "Nuevo registro"}</p>
            {fields.map((f) => (
              <label key={f.name} className="block text-sm">
                <span className="text-muted">{f.label}</span>
                {f.type === "textarea" ? (
                  <textarea rows={3} value={String(editing[f.name] ?? "")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="mt-1 w-full border border-line bg-transparent p-2" />
                ) : f.type === "boolean" ? (
                  <input type="checkbox" checked={Boolean(editing[f.name])} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.checked })} className="ml-3 align-middle accent-ink" />
                ) : f.type === "select" ? (
                  <select value={String(editing[f.name] ?? "")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="mt-1 w-full border-b border-line bg-transparent py-1">
                    {f.nullable && <option value="">— Cualquiera —</option>}
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "color" ? (
                  <span className="mt-1 flex items-center gap-3">
                    <input type="color" value={String(editing[f.name] ?? "#000000")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="h-8 w-10 border border-line bg-transparent" />
                    <input value={String(editing[f.name] ?? "")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="w-full border-b border-line bg-transparent py-1" />
                  </span>
                ) : (
                  <input type={f.type} step={f.step} value={editing[f.name] == null ? "" : String(editing[f.name])} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="mt-1 w-full border-b border-line bg-transparent py-1" />
                )}
                {f.hint && <span className="mt-1 block text-xs text-muted">{f.hint}</span>}
                {errors[f.name] && <span className="mt-1 block text-xs text-danger">{errors[f.name]}</span>}
              </label>
            ))}
            {errors._ && <p className="text-sm text-danger">{errors._}</p>}
            <div className="flex gap-4 pt-2">
              <button disabled={saving} className="bg-ink px-4 py-2 text-sm text-paper disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
              <button type="button" onClick={() => setEditing(null)} className="text-sm text-muted underline underline-offset-4">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
