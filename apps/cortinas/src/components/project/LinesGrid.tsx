"use client";
/**
 * Planilla de líneas: una fila por ventana (o grupo de ventanas iguales).
 * Celdas editables, duplicar filas, añadir N copias, pegar desde Excel (TSV)
 * e importar CSV/XLSX. Valida en vivo con el motor de reglas (errores por celda)
 * y el servidor vuelve a validar al guardar.
 */
import { useEffect, useMemo, useState } from "react";
import { formatMoney, type Drive } from "@portafolio/core/pricing";
import { readSheetFile, saveGrid, type GridCellErrors, type GridRowInput } from "@/app/actions/project";
import { priceLine } from "@/lib/line-price";
import { evaluate, fabricsByType, firstEnabled, type Choice } from "@/lib/rules";
import { btnLine, btnPrimary, labelCls, locName, type EditorContext } from "./shared";

type Col = "location" | "model" | "width" | "height" | "quantity" | "fabric" | "frame" | "drive" | "note";
interface Row {
  key: string;
  id?: number;
  location: string;
  modelId: number | null;
  width: string;
  height: string;
  quantity: string;
  fabricId: number | null;
  frameColorId: number | null;
  drive: Drive | null;
  note: string;
  unmatched?: Partial<Record<Col, string>>;
}

const COLS: { key: Col; label: string; w: string }[] = [
  { key: "location", label: "Ubicación", w: "min-w-[150px]" },
  { key: "model", label: "Producto", w: "min-w-[170px]" },
  { key: "width", label: "Ancho cm", w: "w-[76px]" },
  { key: "height", label: "Alto cm", w: "w-[76px]" },
  { key: "quantity", label: "Cant.", w: "w-[56px]" },
  { key: "fabric", label: "Tela", w: "min-w-[150px]" },
  { key: "frame", label: "Color perfil", w: "min-w-[150px]" },
  { key: "drive", label: "Accionamiento", w: "min-w-[150px]" },
  { key: "note", label: "Nota", w: "min-w-[140px]" },
];
/** Orden de columnas para pegar sin encabezados (igual que la plantilla). */
const ORDER: Col[] = ["location", "model", "width", "height", "quantity", "fabric", "frame", "drive", "note"];
const ALIASES: Record<Col, string[]> = {
  location: ["ubicacion", "ambiente", "aula", "oficina", "espacio", "local"],
  model: ["producto", "modelo", "tipo"],
  width: ["ancho_cm", "ancho", "ancho (cm)"],
  height: ["alto_cm", "alto", "alto (cm)", "caida"],
  quantity: ["cantidad", "cant", "unidades", "uds"],
  fabric: ["tela", "tejido", "color_tela"],
  frame: ["color_perfil", "perfil", "color perfil", "ral"],
  drive: ["accionamiento", "mando", "motor"],
  note: ["nota", "observacion", "comentario"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
let seq = 0;
const newKey = () => `n${Date.now().toString(36)}${seq++}`;
const cell = "w-full bg-transparent px-1.5 py-1 outline-none focus:bg-white-stone";

/** "1,80" (m) -> 180; "180" -> 180. */
function toCm(v: string): string {
  const n = Number(v.replace(",", ".").replace(/[^\d.]/g, ""));
  if (!n) return "";
  return String(Math.round(n < 10 ? n * 100 : n));
}

export function LinesGrid({ ctx }: { ctx: EditorContext }) {
  const { data, catalog, readOnly } = ctx;
  const locById = useMemo(() => new Map(data.locations.map((l) => [l.id, l])), [data.locations]);

  const fromData = () =>
    data.lines.map<Row>((l) => ({
      key: `l${l.id}`, id: l.id, location: locName(l.locationId ? locById.get(l.locationId) : null) || "",
      modelId: l.config?.modelId ?? null, width: l.width ? String(l.width) : "", height: l.height ? String(l.height) : "", quantity: String(l.quantity),
      fabricId: l.config?.fabricId || null, frameColorId: l.config?.frameColorId || null, drive: (l.config?.drive as Drive) ?? null, note: l.note,
    }));
  const [rows, setRows] = useState<Row[]>(fromData);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState("10");
  const [serverErr, setServerErr] = useState<GridCellErrors>({});
  const [importMsg, setImportMsg] = useState<string | null>(null);
  // Tras guardar (u otra acción) recargamos desde el servidor si no hay cambios locales.
  useEffect(() => { if (!dirty) setRows(fromData()); }, [data.lines]); // eslint-disable-line react-hooks/exhaustive-deps

  const evals = rows.map((r) =>
    r.modelId ? evaluate(catalog, { modelId: r.modelId, fabricId: r.fabricId, frameColorId: r.frameColorId, drive: r.drive, width: Number(r.width) || null, height: Number(r.height) || null }) : null,
  );
  const errorsOf = (i: number): Partial<Record<Col, string>> => {
    const r = rows[i], ev = evals[i];
    const e: Partial<Record<Col, string>> = {};
    for (const [k, v] of Object.entries(r.unmatched ?? {})) if (v) e[k as Col] = `No reconocido: “${v}”.`;
    if (!r.location.trim()) e.location = "Indique la ubicación.";
    if (!Number(r.width)) e.width ??= "Indique el ancho.";
    if (!Number(r.height)) e.height ??= "Indique el alto.";
    const q = Number(r.quantity);
    if (!(q >= 1 && q <= 500)) e.quantity = "Cantidad entre 1 y 500.";
    if (ev) {
      if (ev.errors.width) e.width ??= ev.errors.width;
      if (ev.errors.height) e.height ??= ev.errors.height;
      if (ev.errors.fabric) e.fabric ??= ev.errors.fabric;
      if (ev.errors.frame) e.frame ??= ev.errors.frame;
      if (ev.errors.drive) e.drive ??= ev.errors.drive;
    }
    const s = serverErr[i];
    if (s) for (const [k, v] of Object.entries(s)) if (v) e[(k === "model" ? "model" : k) as Col] ??= v;
    return e;
  };
  const allErrors = rows.map((_, i) => errorsOf(i));
  const badRows = allErrors.filter((e) => Object.keys(e).length).length;

  const price = (i: number) => {
    const r = rows[i];
    if (!r.modelId || Object.keys(allErrors[i]).length) return null;
    const p = priceLine(catalog, { modelId: r.modelId, fabricId: r.fabricId ?? 0, frameColorId: r.frameColorId ?? 0, drive: r.drive ?? "manual", width: Number(r.width), height: Number(r.height) });
    return p ? p.unitPrice * Number(r.quantity) : null;
  };
  const total = rows.reduce((s, _, i) => s + (price(i) ?? 0), 0);
  const windows = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  /** Aplica un cambio y completa opciones por defecto (primera habilitada) si faltan o ya no aplican. */
  function normalizeRow(r: Row): Row {
    if (!r.modelId) return r;
    const ev = evaluate(catalog, { modelId: r.modelId, fabricId: r.fabricId, frameColorId: r.frameColorId, drive: r.drive });
    const next = { ...r };
    if (ev.requires.fabric && !ev.fabrics.some((f) => f.value === r.fabricId) && !r.unmatched?.fabric) next.fabricId = firstEnabled(ev.fabrics) ?? null;
    if (!ev.requires.frame) next.frameColorId = null;
    else if (!ev.frames.some((f) => f.value === r.frameColorId) && !r.unmatched?.frame) next.frameColorId = firstEnabled(ev.frames) ?? null;
    if (!ev.drives.some((d) => d.value === r.drive) && !r.unmatched?.drive) next.drive = firstEnabled(ev.drives) ?? null;
    return next;
  }
  const update = (i: number, patch: Partial<Row>, col?: Col) => {
    setRows((rs) => rs.map((r, j) => (j === i ? normalizeRow({ ...r, ...patch, unmatched: col ? { ...r.unmatched, [col]: undefined } : r.unmatched }) : r)));
    setServerErr({});
    setDirty(true);
  };
  const blank = (): Row => {
    const last = rows[rows.length - 1];
    return normalizeRow({ key: newKey(), location: last?.location || `Ubicación ${data.locations.length + 1}`, modelId: last?.modelId ?? catalog.models[0]?.id ?? null, width: "", height: "", quantity: "1", fabricId: last?.fabricId ?? null, frameColorId: last?.frameColorId ?? null, drive: last?.drive ?? "manual", note: "" });
  };
  const change = (fn: (rs: Row[]) => Row[]) => { setRows(fn); setServerErr({}); setDirty(true); };

  /** Convierte una tabla de texto (pegada o importada) en filas. */
  function tableToRows(table: string[][]): Row[] {
    const t = table.filter((r) => r.some((c) => c.trim()));
    if (!t.length) return [];
    const head = t[0].map(norm);
    const hasHeader = head.some((h) => Object.values(ALIASES).some((a) => a.includes(h)));
    const idx: Partial<Record<Col, number>> = {};
    if (hasHeader) (Object.keys(ALIASES) as Col[]).forEach((c) => { const k = head.findIndex((h) => ALIASES[c].includes(h)); if (k >= 0) idx[c] = k; });
    else ORDER.forEach((c, k) => (idx[c] = k));
    return (hasHeader ? t.slice(1) : t).map((cells) => {
      const get = (c: Col) => (idx[c] != null ? (cells[idx[c]!] ?? "").trim() : "");
      const unmatched: Row["unmatched"] = {};
      const pName = get("model");
      const model = pName ? catalog.models.find((m) => norm(m.name) === norm(pName) || m.slug === norm(pName) || norm(m.name).startsWith(norm(pName))) : catalog.models[0];
      if (pName && !model) unmatched.model = pName;
      const fName = get("fabric");
      const fabric = fName && model ? fabricsByType(catalog.fabrics, model).find((f) => norm(f.name) === norm(fName) || norm(f.code) === norm(fName) || norm(`${f.collection} · ${f.name}`) === norm(fName)) : undefined;
      if (fName && !fabric) unmatched.fabric = fName;
      const pf = get("frame");
      const ral = pf.replace(/\D/g, "");
      const frame = pf ? catalog.frames.find((f) => norm(f.name) === norm(pf) || (ral.length === 4 && f.ral === ral) || norm(pf).includes(norm(f.name))) : undefined;
      if (pf && !frame) unmatched.frame = pf;
      const d = norm(get("drive"));
      const drive: Drive | null = !d ? null : /sensor|centraliz|domot/.test(d) ? "sensor" : /motor/.test(d) ? "motor" : /cadena|manual/.test(d) ? "manual" : null;
      if (d && !drive) unmatched.drive = get("drive");
      return normalizeRow({
        key: newKey(), location: get("location") || "Ubicación 1", modelId: model?.id ?? null, width: toCm(get("width")), height: toCm(get("height")),
        quantity: String(Math.max(1, Math.round(Number(get("quantity").replace(",", ".")) || 1))), fabricId: fabric?.id ?? null, frameColorId: frame?.id ?? null,
        drive, note: get("note"), unmatched,
      });
    });
  }

  function onPaste(e: React.ClipboardEvent) {
    if (readOnly) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.trim().includes("\n")) return; // pegado normal en una celda
    e.preventDefault();
    const table = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
    const added = tableToRows(table);
    change((rs) => [...rs.filter((r) => r.id || r.width || r.height), ...added]);
    setImportMsg(`${added.length} filas pegadas.`);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    const r = await readSheetFile(data.project.id, fd);
    if ("error" in r) return setImportMsg(r.error);
    const added = tableToRows(r.table);
    change((rs) => [...rs, ...added]);
    setImportMsg(`${added.length} filas importadas de ${file.name}. Revise y guarde.`);
  }

  async function save() {
    const payload: GridRowInput[] = rows.map((r) => ({
      id: r.id ?? null, location: r.location, modelId: r.modelId, width: Number(r.width) || null, height: Number(r.height) || null,
      quantity: Number(r.quantity) || 0, fabricId: r.fabricId, frameColorId: r.frameColorId, drive: r.drive, note: r.note,
    }));
    const res = await saveGrid(data.project.id, payload);
    if (!res.ok && "cells" in res) {
      setServerErr(res.cells);
      await ctx.act(Promise.resolve({ ok: false, error: res.error }));
      return;
    }
    setDirty(false);
    setImportMsg(null);
    await ctx.act(Promise.resolve(res), `Planilla guardada: ${payload.length} filas.`);
  }

  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const selected = rows.filter((r) => sel.has(r.key));
  const dup = (times: number) => {
    const src = selected.length ? selected : rows.slice(-1);
    if (!src.length) return;
    const n = Math.min(200, Math.max(1, times));
    change((rs) => {
      const out = [...rs];
      const at = Math.max(...src.map((r) => rs.indexOf(r))) + 1;
      const copies: Row[] = [];
      for (let t = 0; t < n; t++) for (const r of src) copies.push({ ...r, key: newKey(), id: undefined });
      out.splice(at, 0, ...copies);
      return out;
    });
  };

  const select = <T extends string | number>(i: number, col: Col, value: T | null, choices: Choice<T>[], onPick: (v: T) => void, placeholder: string) => (
    <select className={cell} value={value ?? ""} disabled={readOnly} aria-label={`${COLS.find((c) => c.key === col)!.label} fila ${i + 1}`}
      onChange={(e) => onPick((typeof choices[0]?.value === "number" ? Number(e.target.value) : e.target.value) as T)}>
      {value == null && <option value="">{placeholder}</option>}
      {choices.map((c) => <option key={String(c.value)} value={c.value} disabled={!!c.disabled}>{c.label}{c.disabled ? ` — ${c.disabled}` : ""}</option>)}
    </select>
  );

  return (
    <div onPaste={onPaste} data-testid="lines-grid">
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-3 border-b border-line pb-4 text-sm">
          <button type="button" className={btnLine} onClick={() => change((rs) => [...rs, blank()])}>+ Fila</button>
          <button type="button" className={btnLine} onClick={() => dup(1)} disabled={!rows.length}>Duplicar {selected.length > 1 ? `${selected.length} filas` : "fila"}</button>
          <span className="flex items-center gap-2">
            <button type="button" className={btnLine} onClick={() => dup(Number(copies) || 1)} disabled={!rows.length} data-testid="add-copies">Añadir</button>
            <input className="w-12 border-b border-line bg-transparent text-center font-mono" value={copies} onChange={(e) => setCopies(e.target.value.replace(/\D/g, ""))} aria-label="Número de copias" />
            <span className="text-muted">copias</span>
          </span>
          {selected.length > 0 && (
            <button type="button" className="text-muted hover:text-danger" onClick={() => { change((rs) => rs.filter((r) => !sel.has(r.key))); setSel(new Set()); }}>Quitar {selected.length}</button>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-3">
            <label className={`${btnLine} cursor-pointer`}>
              Importar Excel/CSV
              <input type="file" accept=".csv,.xlsx,.txt" className="sr-only" onChange={onImport} data-testid="grid-import" />
            </label>
            <span className="text-muted">Plantilla: <a className="underline underline-offset-4" href="/api/plantilla-medidas?formato=xlsx">Excel</a> · <a className="underline underline-offset-4" href="/api/plantilla-medidas">CSV</a></span>
          </span>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Puede pegar filas copiadas de Excel (Ctrl + V) con las columnas de la plantilla.
      </p>
      {importMsg && <p className="mt-2 text-sm text-blue" data-testid="grid-message">{importMsg}</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="font-mono text-[11px] text-muted">
            <tr className="border-b border-ink">
              <th className="w-8 py-2" />
              <th className="w-8 py-2 font-normal">#</th>
              {COLS.map((c) => <th key={c.key} className={`py-2 pl-1.5 font-normal ${c.w}`}>{c.label}</th>)}
              <th className="py-2 pr-1 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ev = evals[i];
              const err = allErrors[i];
              const td = (col: Col, child: React.ReactNode) => (
                <td key={col} className={`border-l border-line/60 align-top ${err[col] ? "bg-danger/[0.06] outline outline-1 -outline-offset-1 outline-danger/60" : ""}`} title={err[col]}>
                  {child}
                  {err[col] && <span className="block px-1.5 pb-1 text-[11px] leading-tight text-danger" data-testid="cell-error">{err[col]}</span>}
                </td>
              );
              const p = price(i);
              return (
                <tr key={r.key} className={`border-b border-line ${sel.has(r.key) ? "bg-white-stone" : ""}`} data-testid="grid-row">
                  <td className="py-1 align-top"><input type="checkbox" checked={sel.has(r.key)} onChange={() => toggle(r.key)} aria-label={`Seleccionar fila ${i + 1}`} className="mt-2 accent-[#1f3a5f]" /></td>
                  <td className="py-1 pt-2 align-top font-mono text-[11px] text-muted">{i + 1}</td>
                  {td("location", <input className={cell} value={r.location} disabled={readOnly} list="grid-locations" onChange={(e) => update(i, { location: e.target.value }, "location")} aria-label={`Ubicación fila ${i + 1}`} />)}
                  {td("model", select(i, "model", r.modelId, catalog.models.map((m) => ({ value: m.id, label: m.name })), (v) => update(i, { modelId: v }, "model"), r.unmatched?.model ?? "Sin configurar"))}
                  {td("width", <input className={`${cell} font-mono`} inputMode="numeric" value={r.width} disabled={readOnly} onChange={(e) => update(i, { width: e.target.value.replace(/\D/g, "") })} aria-label={`Ancho fila ${i + 1}`} placeholder={ev ? `${ev.limits.minWidth}–${ev.limits.maxWidth}` : ""} />)}
                  {td("height", <input className={`${cell} font-mono`} inputMode="numeric" value={r.height} disabled={readOnly} onChange={(e) => update(i, { height: e.target.value.replace(/\D/g, "") })} aria-label={`Alto fila ${i + 1}`} placeholder={ev ? `${ev.limits.minHeight}–${ev.limits.maxHeight}` : ""} />)}
                  {td("quantity", <input className={`${cell} font-mono`} inputMode="numeric" value={r.quantity} disabled={readOnly} onChange={(e) => update(i, { quantity: e.target.value.replace(/\D/g, "") })} aria-label={`Cantidad fila ${i + 1}`} />)}
                  {td("fabric", ev && !ev.requires.fabric ? <span className="block px-1.5 py-1 text-muted">—</span> : select(i, "fabric", r.fabricId, ev?.fabrics ?? [], (v) => update(i, { fabricId: v }, "fabric"), r.unmatched?.fabric ?? "Tela…"))}
                  {td("frame", ev && !ev.requires.frame ? <span className="block px-1.5 py-1 text-muted">No aplica</span> : select(i, "frame", r.frameColorId, ev?.frames ?? [], (v) => update(i, { frameColorId: v }, "frame"), r.unmatched?.frame ?? "Perfil…"))}
                  {td("drive", select(i, "drive", r.drive, ev?.drives ?? [], (v) => update(i, { drive: v as Drive }, "drive"), r.unmatched?.drive ?? "Accionamiento…"))}
                  {td("note", <input className={cell} value={r.note} disabled={readOnly} onChange={(e) => update(i, { note: e.target.value })} aria-label={`Nota fila ${i + 1}`} />)}
                  <td className="py-1 pt-2 pr-1 text-right align-top">{p != null ? formatMoney(p) : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={12} className="py-6 text-muted">Sin líneas. Agregue una fila, pegue desde Excel o importe la plantilla.</td></tr>}
          </tbody>
        </table>
        <datalist id="grid-locations">{data.locations.map((l) => <option key={l.id} value={locName(l)} />)}</datalist>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink pt-4">
        <p className={labelCls}>{rows.length} filas · {windows} ventanas · {formatMoney(total)}</p>
        {badRows > 0 && <p className="text-sm text-danger" data-testid="grid-bad-rows">{badRows} {badRows === 1 ? "fila con errores" : "filas con errores"}</p>}
        {!readOnly && (
          <button type="button" className={`${btnPrimary} ml-auto`} disabled={ctx.busy || !dirty} onClick={save} data-testid="grid-save">
            {dirty ? "Guardar planilla" : "Planilla guardada"}
          </button>
        )}
      </div>
    </div>
  );
}
