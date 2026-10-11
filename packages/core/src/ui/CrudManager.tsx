"use client";
/**
 * Gestor CRUD genérico del panel: tabla + formulario lateral.
 * Se configura con una lista de campos; habla con /api/admin/<recurso>.
 * Ejemplo de uso en la app: <CrudManager resource="fabrics" fields={[...]} ... />
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export type FieldType = "text" | "textarea" | "number" | "color" | "boolean" | "select" | "specs" | "multiselect" | "image" | "gallery" | "attrs";

/** Para "attrs": atributos disponibles con sus valores. */
export interface AttrOption { id: number; name: string; values: { id: number; name: string }[]; defaultOn?: boolean; note?: string }
type AttrConf = { attributeId: number; required: boolean; valueIds: number[] };

export interface CrudField {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  /** Si es true, un valor vacío se guarda como null. */
  nullable?: boolean;
  step?: number;
  hint?: string;
  /** Para "image"/"gallery": endpoint que recibe el archivo (POST multipart) y devuelve { url }. */
  uploadUrl?: string;
  /** Para "attrs": atributos que se pueden pedir. */
  attrOptions?: AttrOption[];
  /** En "attrs": enlace con un campo de materiales (multiselect). Los atributos "según material" que activan los materiales elegidos se añaden/quitan solos. */
  materialLinks?: { field: string; scoped: number[]; materials: { slug: string; name: string; attrs: { attributeId: number; valueIds: number[] }[] }[] };
  /** Solo se muestra en la tabla; no se edita. */
  readOnly?: boolean;
  /** En "multiselect": casilla "Todos" (valor vacío = todos, también los futuros). */
  allLabel?: string;
  /** En "select": limita las opciones según el valor de otro campo (map[valor] = opciones permitidas; sin entrada = todas). */
  filterBy?: { field: string; map: Record<string, string[]> };
  /** En "attrs": ocultar "Obligatorio" (materiales). Los atributos con defaultOn vienen marcados salvo que se desmarquen (valueIds [-1]). */
  noRequired?: boolean;
  /** Mostrar en la tabla. */
  column?: boolean;
  /** Mínimo del número. En "sortOrder" por defecto 1 (orden visible desde 1; un registro nuevo va al final). */
  min?: number;
  /** Oculto en tabla y formulario (se conserva su valor al guardar). */
  hidden?: boolean;
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
  const columns = fields.filter((f) => f.column && !f.hidden);

  function emptyRow(): Partial<Row> {
    const r: Record<string, unknown> = {};
    for (const f of fields) r[f.name] = f.type === "specs" || f.type === "gallery" || f.type === "attrs" ? [] : f.type === "multiselect" ? "" : f.type === "boolean" ? true : f.type === "number" ? (f.nullable ? null : 0) : f.type === "color" ? (f.nullable ? "" : "#cccccc") : f.nullable ? null : (f.options?.[0]?.value ?? "");
    for (const f of fields) if (f.type === "number" && f.name === "sortOrder") r[f.name] = Math.max(0, ...rows.map((x) => Number(x[f.name]) || 0)) + 1;
    return r;
  }

  /** Convierte los valores del formulario a los tipos que espera la API. */
  function toPayload(row: Partial<Row>) {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.readOnly) continue;
      let v = row[f.name];
      if (f.type === "number") v = v === "" || v === null || v === undefined ? (f.nullable ? null : 0) : Number(v);
      else if (f.type === "gallery" || f.type === "attrs") v = Array.isArray(v) ? v : [];
      else if (f.type === "specs") v = ((v as { label: string; value: string }[]) ?? []).map((r) => ({ label: r.label.trim(), value: r.value.trim() })).filter((r) => r.label && r.value);
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
    if (f.type === "color" && !value) return "—";
    if (f.type === "color")
      return (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full border border-line" style={{ background: String(value) }} />
          <span className="text-muted">{String(value)}</span>
        </span>
      );
    if (f.type === "image") return value ? <img src={String(value)} alt="" className="h-10 w-14 border border-line object-cover" /> : "—";
    if (f.type === "gallery") return Array.isArray(value) && value.length ? `${value.length} fotos` : "—";
    if (f.type === "attrs") {
      const list = (value as AttrConf[] | undefined) ?? [];
      return list.length ? list.map((a) => `${f.attrOptions?.find((o) => o.id === a.attributeId)?.name ?? a.attributeId}${a.required ? "" : " (opc.)"}`).join(", ") : "—";
    }
    if (f.type === "specs") return Array.isArray(value) && value.length ? `${value.length} filas` : "—";
    if (f.type === "multiselect") {
      const v = String(value ?? "").split(",").filter(Boolean);
      return v.length ? v.map((x) => f.options?.find((o) => o.value === x)?.label ?? x).join(", ") : "Todas";
    }
    if (f.type === "select") return f.options?.find((o) => o.value === String(value))?.label ?? (value == null ? "—" : String(value));
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
            {fields.filter((f) => !f.readOnly && !f.hidden).map((f) => f.type === "image" || f.type === "gallery" ? (
              <PhotoField key={f.name} field={f} value={editing[f.name]} error={errors[f.name]} onChange={(v) => setEditing({ ...editing, [f.name]: v })} />
            ) : f.type === "attrs" ? (
              <AttrsEditor key={f.name} field={f} error={errors[f.name]} value={(editing[f.name] as AttrConf[] | undefined) ?? []} linked={f.materialLinks ? String(editing[f.materialLinks.field] ?? "") : ""}
                onChange={(v) => setEditing({ ...editing, [f.name]: v })} />
            ) : f.type === "specs" ? (
              <SpecsEditor key={f.name} label={f.label} hint={f.hint} error={errors[f.name]}
                rows={(editing[f.name] as SpecRow[] | undefined) ?? []}
                onChange={(rows) => setEditing({ ...editing, [f.name]: rows })} />
            ) : (
              <FieldWrap key={f.name} multi={f.type === "multiselect"}>
                <span className="text-muted">{f.label}</span>
                {f.type === "textarea" ? (
                  <textarea rows={3} value={String(editing[f.name] ?? "")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="mt-1 w-full border border-line bg-transparent p-2" />
                ) : f.type === "boolean" ? (
                  <input type="checkbox" checked={Boolean(editing[f.name])} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.checked })} className="ml-3 align-middle accent-ink" />
                ) : f.type === "multiselect" ? (
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {f.allLabel && (() => {
                      const all = !String(editing[f.name] ?? "");
                      const apply = (nextVal: string) => {
                        const next: Partial<Row> = { ...editing, [f.name]: nextVal };
                        for (const af of fields) if (af.materialLinks?.field === f.name) next[af.name] = syncAttrs(af, nextVal, (editing[af.name] as AttrConf[] | undefined) ?? []);
                        setEditing(next);
                      };
                      return (
                        <label className="inline-flex items-center gap-1.5 font-medium">
                          <input type="checkbox" checked={all} className="accent-ink" aria-label={`${f.label}: ${f.allLabel}`} onChange={(e) => apply(e.target.checked ? "" : (f.options ?? []).map((o) => o.value).join(","))} />
                          <span>{f.allLabel}</span>
                        </label>
                      );
                    })()}
                    {(f.filterBy && f.filterBy.map[String(editing[f.filterBy.field] ?? "")]?.length ? f.options?.filter((o) => f.filterBy!.map[String(editing[f.filterBy!.field] ?? "")].includes(o.value)) : f.options)?.map((o) => {
                      const all = !!f.allLabel && !String(editing[f.name] ?? "");
                      const cur = String(editing[f.name] ?? "").split(",").filter(Boolean);
                      const on = all || cur.includes(o.value);
                      return (
                        <label key={o.value} className={`inline-flex items-center gap-1.5 ${all ? "text-muted" : ""}`}>
                          <input type="checkbox" checked={on} disabled={all} className="accent-ink" aria-label={o.label}
                            onChange={() => {
                              const nextVal = (on ? cur.filter((x) => x !== o.value) : [...cur, o.value]).join(",");
                              if (f.allLabel && !nextVal) return;
                              const next: Partial<Row> = { ...editing, [f.name]: nextVal };
                              for (const af of fields) if (af.materialLinks?.field === f.name) next[af.name] = syncAttrs(af, nextVal, (editing[af.name] as AttrConf[] | undefined) ?? []);
                              setEditing(next);
                            }} />
                          <span>{o.label}</span>
                        </label>
                      );
                    })}
                  </span>
                ) : f.type === "select" ? (
                  <select value={String(editing[f.name] ?? "")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="mt-1 w-full border-b border-line bg-transparent py-1">
                    {f.nullable && <option value="">— Cualquiera —</option>}
                    {(f.filterBy && f.filterBy.map[String(editing[f.filterBy.field] ?? "")]?.length ? f.options?.filter((o) => f.filterBy!.map[String(editing[f.filterBy!.field] ?? "")].includes(o.value) || o.value === String(editing[f.name] ?? "")) : f.options)?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "color" ? (
                  <span className="mt-1 flex items-center gap-3">
                    <input type="color" value={String(editing[f.name] ?? "#000000")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="h-8 w-10 border border-line bg-transparent" />
                    <input value={String(editing[f.name] ?? "")} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="w-full border-b border-line bg-transparent py-1" />
                  </span>
                ) : (
                  <input type={f.type} step={f.step} min={f.min ?? (f.name === "sortOrder" ? 1 : undefined)} value={editing[f.name] == null ? "" : String(editing[f.name])} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="mt-1 w-full border-b border-line bg-transparent py-1" />
                )}
                {f.hint && <span className="mt-1 block text-xs text-muted">{f.hint}</span>}
                {errors[f.name] && <span className="mt-1 block text-xs text-danger">{errors[f.name]}</span>}
              </FieldWrap>
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

type SpecRow = { label: string; value: string };

/** Editor de ficha técnica: filas clave/valor que se pueden añadir y quitar. */
function SpecsEditor({ label, hint, error, rows, onChange }: { label: string; hint?: string; error?: string; rows: SpecRow[]; onChange: (rows: SpecRow[]) => void }) {
  const set = (i: number, k: keyof SpecRow, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="block text-sm" data-testid="specs-editor">
      <span className="text-muted">{label}</span>
      <div className="mt-1 divide-y divide-line border-y border-line">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <input aria-label="Característica" placeholder="Característica" value={r.label} onChange={(e) => set(i, "label", e.target.value)} className="w-2/5 bg-transparent py-1 text-muted outline-none" />
            <input aria-label="Valor" placeholder="Valor" value={r.value} onChange={(e) => set(i, "value", e.target.value)} className="min-w-0 flex-1 bg-transparent py-1 outline-none" />
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="px-1 text-muted hover:text-danger" aria-label="Quitar fila">×</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...rows, { label: "", value: "" }])} className="mt-2 text-ink underline underline-offset-4">+ Añadir fila</button>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </div>
  );
}

/** Envoltorio de campo: <label> normal; <div> para listas de casillas (cada casilla lleva su propio label). */
function FieldWrap({ multi, children }: { multi: boolean; children: React.ReactNode }) {
  return multi ? <div className="block text-sm">{children}</div> : <label className="block text-sm">{children}</label>;
}

/** Fotos del producto: subir, ver miniatura, quitar y ordenar (galería). */
function PhotoField({ field, value, error, onChange }: { field: CrudField; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const multi = field.type === "gallery";
  const list = multi ? ((value as string[] | undefined) ?? []) : value ? [String(value)] : [];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function upload(files: FileList | null) {
    if (!files?.length || !field.uploadUrl) return;
    setBusy(true);
    setMsg(null);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { setMsg("Solo imágenes JPG, PNG o WEBP."); continue; }
      if (file.size > 4 * 1024 * 1024) { setMsg(`“${file.name}” supera 4 MB.`); continue; }
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(field.uploadUrl, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) urls.push(data.url);
      else setMsg(data.error ?? "No se pudo subir la foto.");
    }
    setBusy(false);
    if (urls.length) onChange(multi ? [...list, ...urls] : urls[0]);
  }
  const move = (i: number, d: number) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="block text-sm" data-testid={`photo-${field.name}`}>
      <span className="text-muted">{field.label}</span>
      <div className="mt-2 flex flex-wrap gap-3">
        {list.map((src, i) => (
          <div key={src + i} className="relative">
            <img src={src} alt="" className="h-20 w-24 border border-line object-cover" />
            <div className="mt-1 flex justify-between text-xs text-muted">
              {multi && i > 0 ? <button type="button" onClick={() => move(i, -1)} aria-label="Mover a la izquierda">←</button> : <span />}
              <button type="button" onClick={() => onChange(multi ? list.filter((_, j) => j !== i) : "")} className="hover:text-danger">Quitar</button>
              {multi && i < list.length - 1 ? <button type="button" onClick={() => move(i, 1)} aria-label="Mover a la derecha">→</button> : <span />}
            </div>
          </div>
        ))}
        <label className={`flex h-20 w-24 cursor-pointer items-center justify-center border border-dashed border-line text-center text-xs text-muted hover:border-ink hover:text-ink ${busy ? "opacity-50" : ""}`}>
          {busy ? "Subiendo…" : multi ? "+ Añadir fotos" : list.length ? "Cambiar foto" : "+ Subir foto"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple={multi} className="sr-only" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {field.hint && <span className="mt-1 block text-xs text-muted">{field.hint}</span>}
      {(msg || error) && <span className="mt-1 block text-xs text-danger">{msg || error}</span>}
    </div>
  );
}

/** Atributos que pide una categoría: marcar, obligatorio y valores permitidos ("Todos" = lista vacía). */
/** Materiales elegidos que activan un atributo (con sus valores permitidos). */
function sourcesFor(field: CrudField, linked: string, attributeId: number) {
  const sel = linked.split(",").filter(Boolean);
  return (field.materialLinks?.materials ?? []).filter((m) => !sel.length || sel.includes(m.slug)).map((m) => ({ m, e: m.attrs.find((x) => x.attributeId === attributeId) })).filter((x) => x.e && x.e.valueIds[0] !== -1);
}
/** Añade los atributos que activan los materiales elegidos y quita los que ya no activa ninguno. */
function syncAttrs(field: CrudField, linked: string, value: AttrConf[]): AttrConf[] {
  const scoped = field.materialLinks?.scoped ?? [];
  let next = value.filter((v) => !scoped.includes(v.attributeId) || sourcesFor(field, linked, v.attributeId).length > 0);
  for (const id of scoped) if (!next.some((v) => v.attributeId === id) && sourcesFor(field, linked, id).length) next = [...next, { attributeId: id, required: true, valueIds: [] }];
  return next;
}

function AttrsEditor({ field, value, error, onChange, linked = "" }: { field: CrudField; value: AttrConf[]; error?: string; onChange: (v: AttrConf[]) => void; linked?: string }) {
  const find = (id: number) => value.find((v) => v.attributeId === id);
  const set = (id: number, patch: Partial<AttrConf> | null) => {
    const cur = find(id);
    if (patch === null) return onChange(value.filter((v) => v.attributeId !== id));
    onChange(cur ? value.map((v) => (v.attributeId === id ? { ...v, ...patch } : v)) : [...value, { attributeId: id, required: true, valueIds: [], ...patch }]);
  };
  return (
    <div className="block text-sm" data-testid="attrs-editor">
      <span className="text-muted">{field.label}</span>
      <div className="mt-1 divide-y divide-line border-y border-line">
        {(() => {
          const opts = (field.attrOptions ?? []).filter((a) => !field.materialLinks?.scoped.includes(a.id) || sourcesFor(field, linked, a.id).length);
          const ml = field.materialLinks;
          if (!ml) return [{ title: "", list: opts }];
          const sel = linked.split(",").filter(Boolean);
          return [
            { title: "Genéricos", list: opts.filter((a) => !ml.scoped.includes(a.id)) },
            ...ml.materials.filter((m) => !sel.length || sel.includes(m.slug)).map((m) => ({ title: m.name, list: opts.filter((a) => ml.scoped.includes(a.id) && m.attrs.some((e) => e.attributeId === a.id && e.valueIds[0] !== -1)) })),
          ].filter((g) => g.list.length);
        })().map((g) => (
          <div key={g.title || "all"} className="divide-y divide-line" data-testid={g.title ? "attr-group" : undefined}>
            {g.title && <p className="pt-3 font-mono text-[11px] uppercase tracking-wide text-muted">{g.title}</p>}
            {g.list.map((a) => {
          const src = field.materialLinks?.scoped.includes(a.id) ? sourcesFor(field, linked, a.id) : [];
          const srcValues = src.some((x) => !x.e!.valueIds.length) ? [] : [...new Set(src.flatMap((x) => x.e!.valueIds))];
          a = srcValues.length ? { ...a, values: a.values.filter((v) => srcValues.includes(v.id)) } : a;
          const raw = find(a.id);
          const off = raw?.valueIds[0] === -1;
          const cur = a.defaultOn ? (off ? undefined : raw ?? { attributeId: a.id, required: false, valueIds: [] }) : raw;
          return (
            <div key={a.id} className="py-2">
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="accent-ink" checked={!!cur} onChange={(e) => (a.defaultOn ? set(a.id, e.target.checked ? null : { valueIds: [-1] }) : set(a.id, e.target.checked ? {} : null))} aria-label={`Pedir ${a.name}`} />
                  <span className={cur ? "" : "text-muted"}>{a.name}</span>
                  {a.note && !field.materialLinks && <span className="text-xs text-muted">{a.note}</span>}
                  {src.length > 0 && <span className="text-xs text-accent" data-testid="attr-source">desde material {src.map((x) => x.m.name).join(", ")}</span>}
                </label>
                {cur && !field.noRequired && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" className="accent-ink" checked={cur.required} onChange={(e) => set(a.id, { required: e.target.checked })} aria-label={`${a.name} obligatorio`} />
                    Obligatorio
                  </label>
                )}
              </div>
              {cur && a.values.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 pl-6 text-xs">
                  {/* "Todos": lista vacía = todos los valores, también los que se creen después. */}
                  <label className="inline-flex items-center gap-1 font-medium">
                    <input type="checkbox" className="accent-ink" checked={!cur.valueIds.length} aria-label={`${a.name}: todos los valores`}
                      onChange={(e) => set(a.id, { valueIds: e.target.checked ? [] : a.values.map((v) => v.id) })} />
                    <span>Todos</span>
                  </label>
                  {a.values.map((v) => {
                    const all = !cur.valueIds.length;
                    const on = all || cur.valueIds.includes(v.id);
                    return (
                      <label key={v.id} className={`inline-flex items-center gap-1 ${all ? "text-muted" : ""}`}>
                        <input type="checkbox" className="accent-ink" checked={on} disabled={all}
                          onChange={() => { const next = on ? cur.valueIds.filter((x) => x !== v.id) : [...cur.valueIds, v.id]; if (next.length) set(a.id, { valueIds: next }); }} />
                        <span>{v.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
            })}
          </div>
        ))}
      </div>
      {field.hint && <span className="mt-1 block text-xs text-muted">{field.hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </div>
  );
}
