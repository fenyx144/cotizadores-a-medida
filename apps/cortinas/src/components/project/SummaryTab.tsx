"use client";
/** Pestaña "Resumen y envío": totales, descuento por volumen, notas, medición en obra y envío. */
import { useState } from "react";
import { formatMoney } from "@portafolio/core/pricing";
import { summarizeProject } from "@portafolio/core/projects";
import { requestMeasurement, sendProject, updateNotes } from "@/app/actions/project";
import { DISTRICTS } from "@/lib/content";
import { btnLine, btnPrimary, inputCls, labelCls, locName, type EditorContext } from "./shared";

export function SummaryTab({ ctx }: { ctx: EditorContext }) {
  const { data, readOnly } = ctx;
  const locById = new Map(data.locations.map((l) => [l.id, l]));
  const s = summarizeProject(
    data.lines.map((l) => ({
      locationName: locName(l.locationId ? locById.get(l.locationId) : null),
      productName: l.config?.modelName ?? null,
      quantity: l.quantity,
      unitPrice: l.config ? l.unitPrice : null,
    })),
  );
  const [notes, setNotes] = useState(data.project.notes);
  const mr = data.project.measurementRequest;
  const [m, setM] = useState({
    approxWindows: String(mr?.approxWindows ?? ""),
    address: mr?.address ?? data.project.address,
    district: mr?.district ?? data.project.district,
    preferredDate: mr?.preferredDate ?? "",
  });
  const [showMeasure, setShowMeasure] = useState(!!mr);

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <section className="lg:col-span-7">
        <div className="grid grid-cols-3 border-y border-ink">
          {[
            ["Cortinas", String(s.windows)],
            ["Configuradas", String(s.configured)],
            ["Pendientes", String(s.pending)],
          ].map(([k, v], i) => (
            <div key={k} className={`py-5 ${i ? "border-l border-line pl-5" : ""}`}>
              <p className="font-mono text-xs text-muted">{k}</p>
              <p className="mt-1 font-serif text-[2.6rem] leading-none">{v}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-10 text-[1.5rem]">Por ubicación</h3>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {s.byLocation.map((g) => (
              <tr key={g.name} className="border-b border-line">
                <td className="py-2">{g.name}</td>
                <td className="py-2 text-right font-mono text-xs text-muted">{g.quantity} u.</td>
                <td className="w-32 py-2 text-right">{g.amount ? formatMoney(g.amount) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mt-10 text-[1.5rem]">Por producto</h3>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {s.byProduct.map((g) => (
              <tr key={g.name} className="border-b border-line">
                <td className="py-2">{g.name}</td>
                <td className="py-2 text-right font-mono text-xs text-muted">{g.quantity} u.</td>
                <td className="w-32 py-2 text-right">{formatMoney(g.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <aside className="space-y-10 lg:col-span-5">
        <div className="border border-line bg-white-stone p-6" data-testid="summary-totals">
          <dl className="space-y-2 text-[0.95rem]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(s.subtotal)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">Descuento por volumen {s.discountPercent ? `(${s.discountPercent}%)` : ""}</dt>
              <dd>{s.discount ? `− ${formatMoney(s.discount)}` : "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt>Total con IGV</dt>
              <dd className="font-serif text-[2.4rem] leading-none">{formatMoney(s.total)}</dd>
            </div>
            <p className="text-xs text-muted">IGV incluido: {formatMoney(s.igv)}. Descuentos: 5% desde 20 cortinas, 8% desde 50, 12% desde 100. Precio referencial sujeto a medición.</p>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`/api/proyecto/${data.project.id}/pdf`} target="_blank" className={btnLine} data-testid="pdf-link">Descargar PDF</a>
            <a href={`/api/proyecto/${data.project.id}/xlsx`} className={btnLine}>Excel</a>
          </div>
        </div>

        <div>
          <label>
            <span className={labelCls}>Notas para Cota</span>
            <textarea className={`${inputCls} min-h-24 resize-y`} value={notes} disabled={readOnly} onChange={(e) => setNotes(e.target.value)} placeholder="Fechas de instalación, horarios de acceso, contacto en obra…" />
          </label>
          {!readOnly && notes !== data.project.notes && (
            <button type="button" className={`${btnLine} mt-3`} onClick={() => ctx.act(updateNotes(data.project.id, notes), "Notas guardadas.")}>Guardar notas</button>
          )}
        </div>

        <div className="border-t border-line pt-6">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[1.5rem]">Medición en obra</h3>
            {!readOnly && !showMeasure && <button type="button" className="text-sm underline decoration-accent underline-offset-4" onClick={() => setShowMeasure(true)}>Solicitar</button>}
          </div>
          <p className="mt-1 text-sm text-muted">Sin plano o con dudas: vamos, medimos y completamos el proyecto. Sin costo en Arequipa para proyectos de más de 10 ventanas.</p>
          {showMeasure && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label>
                <span className={labelCls}>Ventanas aprox.</span>
                <input className={`${inputCls} font-mono`} inputMode="numeric" value={m.approxWindows} disabled={readOnly} onChange={(e) => setM({ ...m, approxWindows: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label>
                <span className={labelCls}>Fecha sugerida</span>
                <input type="date" className={inputCls} value={m.preferredDate} disabled={readOnly} onChange={(e) => setM({ ...m, preferredDate: e.target.value })} />
              </label>
              <label className="col-span-2">
                <span className={labelCls}>Dirección</span>
                <input className={inputCls} value={m.address} disabled={readOnly} onChange={(e) => setM({ ...m, address: e.target.value })} />
              </label>
              <label className="col-span-2">
                <span className={labelCls}>Distrito</span>
                <input className={inputCls} list="districts" value={m.district} disabled={readOnly} onChange={(e) => setM({ ...m, district: e.target.value })} />
                <datalist id="districts">{DISTRICTS.map((d) => <option key={d} value={d} />)}</datalist>
              </label>
              {!readOnly && (
                <button type="button" className={`${btnLine} col-span-2 justify-self-start`} onClick={() =>
                  ctx.act(requestMeasurement(data.project.id, { ...m, approxWindows: Number(m.approxWindows) }), "Medición solicitada. Se enviará con el proyecto.")}>
                  {mr ? "Actualizar solicitud" : "Guardar solicitud"}
                </button>
              )}
            </div>
          )}
        </div>

        {!readOnly ? (
          <div className="border-t border-ink pt-6">
            <p className="text-sm text-muted">Al enviar, el proyecto queda en solo lectura y lo revisa nuestro equipo técnico. Respuesta en 48 horas hábiles.</p>
            <button type="button" className={`${btnPrimary} mt-4 px-6 py-3`} disabled={ctx.busy} data-testid="send-project"
              onClick={async () => { if (confirm("¿Enviar el proyecto a Cota?")) await ctx.act(sendProject(data.project.id), "Proyecto enviado. Le escribiremos pronto."); }}>
              Enviar a Cota
            </button>
          </div>
        ) : (
          <p className="border-t border-ink pt-6 text-sm">Proyecto enviado el {data.project.sentAt ? new Date(data.project.sentAt).toLocaleDateString("es-PE") : "—"}. Lo verá aquí con su estado.</p>
        )}
      </aside>
    </div>
  );
}
