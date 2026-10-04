"use client";
/** Cotización rápida para particulares: contacto + ventanas o medición en obra. */
import { useState } from "react";
import { formatMoney } from "@portafolio/core/pricing";
import { TextField } from "@portafolio/core/ui/Field";
import { submitQuickQuote } from "@/app/actions/particular";
import { priceLine, type CatalogData } from "@/lib/line-price";
import { DISTRICTS } from "@/lib/content";

type Row = { room: string; modelId: number; width: string; height: string; quantity: string };
const cell = "w-full border-b border-line bg-transparent py-1.5 outline-none focus:border-ink";

export function QuickQuote({ catalog }: { catalog: CatalogData }) {
  const [mode, setMode] = useState<"medidas" | "medicion">("medidas");
  const [rows, setRows] = useState<Row[]>([{ room: "Dormitorio principal", modelId: catalog.models[1]?.id ?? catalog.models[0].id, width: "160", height: "150", quantity: "1" }]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", district: "", address: "", approxWindows: "" });
  const [state, setState] = useState<{ error?: string; fields?: Record<string, string> }>({});
  const [pending, setPending] = useState(false);

  const total = rows.reduce((s, r) => {
    const p = priceLine(catalog, { modelId: r.modelId, fabricId: 0, frameColorId: 0, drive: "manual", width: Number(r.width) || 0, height: Number(r.height) || 0 });
    return s + (p && Number(r.width) && Number(r.height) ? p.unitPrice * (Number(r.quantity) || 1) : 0);
  }, 0);
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const f = state.fields ?? {};

  async function submit() {
    setPending(true);
    const r = await submitQuickQuote({
      ...contact, mode, approxWindows: contact.approxWindows ? Number(contact.approxWindows) : undefined,
      rows: mode === "medidas" ? rows.map((r) => ({ room: r.room, modelId: r.modelId, width: Number(r.width), height: Number(r.height), quantity: Number(r.quantity) || 1 })) : [],
    });
    setPending(false);
    if (r) setState(r);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="flex gap-6 border-b border-line text-[0.95rem]">
          {(["medidas", "medicion"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`-mb-px border-b py-2 ${mode === m ? "border-ink" : "border-transparent text-muted"}`}>
              {m === "medidas" ? "Tengo las medidas" : "Prefiero que midan"}
            </button>
          ))}
        </div>
        {mode === "medidas" ? (
          <div className="mt-6">
            <table className="w-full text-sm">
              <thead className="font-mono text-[11px] text-muted">
                <tr><th className="pb-1 text-left font-normal">Ambiente</th><th className="pb-1 text-left font-normal">Producto</th><th className="w-20 pb-1 text-left font-normal">Ancho cm</th><th className="w-20 pb-1 text-left font-normal">Alto cm</th><th className="w-12 pb-1 text-left font-normal">Cant.</th><th className="w-6" /></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="pr-3"><input className={cell} value={r.room} onChange={(e) => set(i, { room: e.target.value })} aria-label="Ambiente" /></td>
                    <td className="pr-3">
                      <select className={cell} value={r.modelId} onChange={(e) => set(i, { modelId: Number(e.target.value) })} aria-label="Producto">
                        {catalog.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </td>
                    <td className="pr-3"><input className={`${cell} font-mono`} value={r.width} onChange={(e) => set(i, { width: e.target.value.replace(/\D/g, "") })} aria-label="Ancho" /></td>
                    <td className="pr-3"><input className={`${cell} font-mono`} value={r.height} onChange={(e) => set(i, { height: e.target.value.replace(/\D/g, "") })} aria-label="Alto" /></td>
                    <td className="pr-3"><input className={`${cell} font-mono`} value={r.quantity} onChange={(e) => set(i, { quantity: e.target.value.replace(/\D/g, "") })} aria-label="Cantidad" /></td>
                    <td>{rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label="Quitar">×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="mt-4 text-sm underline decoration-accent underline-offset-4" onClick={() => setRows([...rows, { ...rows[rows.length - 1], room: "" }])}>Agregar ventana</button>
          </div>
        ) : (
          <div className="mt-6 max-w-xs">
            <TextField label="Ventanas aproximadas" name="approxWindows" inputMode="numeric" value={contact.approxWindows} error={f.approxWindows} onChange={(e) => setContact({ ...contact, approxWindows: e.target.value.replace(/\D/g, "") })} />
            <p className="mt-3 text-sm text-muted">Visita sin costo en Arequipa. Llevamos el muestrario.</p>
          </div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <TextField label="Nombre" name="name" value={contact.name} error={f.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          <TextField label="Teléfono" name="phone" value={contact.phone} error={f.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          <TextField label="Correo" name="email" type="email" value={contact.email} error={f.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          <TextField label="Distrito" name="district" list="dist" value={contact.district} error={f.district} onChange={(e) => setContact({ ...contact, district: e.target.value })} />
          <datalist id="dist">{DISTRICTS.map((d) => <option key={d} value={d} />)}</datalist>
          <div className="sm:col-span-2"><TextField label="Dirección" name="address" value={contact.address} error={f.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} /></div>
        </div>
      </div>

      <aside className="lg:col-span-4 lg:col-start-9">
        <div className="border border-line bg-white-stone p-6 lg:sticky lg:top-24">
          <p className="font-mono text-xs text-muted">{mode === "medidas" ? "Precio referencial" : "Medición en obra"}</p>
          <p className="mt-2 font-serif text-[2.6rem] leading-none">{mode === "medidas" ? formatMoney(total) : "Sin costo"}</p>
          <p className="mt-3 text-sm text-muted">{mode === "medidas" ? "Con instalación e IGV, tela estándar y cadena. Confirmamos al medir." : "Coordinamos la fecha por WhatsApp en un día hábil."}</p>
          {state.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}
          <button type="button" disabled={pending} onClick={submit} className="mt-6 w-full bg-blue px-5 py-3 text-white-stone hover:bg-ink disabled:opacity-50">
            {pending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      </aside>
    </div>
  );
}
