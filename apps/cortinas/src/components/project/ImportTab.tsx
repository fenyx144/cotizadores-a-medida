"use client";
/** Pestaña "Importar medidas": CSV o Excel -> vista previa con errores -> importar. */
import { useState } from "react";
import type { ImportResult } from "@portafolio/core/import";
import { formatMeters } from "@portafolio/core/pricing";
import { commitImport, previewImport } from "@/app/actions/project";
import { btnLine, btnPrimary, type EditorContext } from "./shared";

export function ImportTab({ ctx, onImported }: { ctx: EditorContext; onImported: () => void }) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  async function onFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const fd = new FormData();
    fd.set("file", file);
    const r = await previewImport(ctx.data.project.id, fd);
    if ("error" in r) {
      setError(r.error);
      setResult(null);
    } else {
      setError(null);
      setResult(r);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h2 className="text-[2rem] leading-tight">Importar medidas</h2>
        <p className="mt-2 text-muted">Una fila por ventana o grupo de ventanas iguales. Las ubicaciones que no existan se crean solas.</p>
        <ol className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          <li>1. <a href="/api/plantilla-medidas" className="underline decoration-accent underline-offset-4">Descargue la plantilla CSV</a> (se abre en Excel).</li>
          <li>2. Complete edificio, piso, ambiente, ancho y alto en cm.</li>
          <li>3. Suba el archivo (.csv o .xlsx) y revise la vista previa.</li>
        </ol>
        <p className="mt-4 font-mono text-[11px] text-muted">Columnas: edificio, piso, ambiente, codigo, ancho_cm, alto_cm, cantidad, producto, nota</p>
        {!ctx.readOnly && (
          <label className={`${btnPrimary} mt-6 inline-block cursor-pointer`}>
            {fileName ? "Elegir otro archivo" : "Elegir archivo"}
            <input type="file" accept=".csv,.xlsx,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="import-file" />
          </label>
        )}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      </div>

      <div className="lg:col-span-8">
        {!result ? (
          <div className="grid-paper grid h-full min-h-60 place-items-center border border-line text-sm text-muted">La vista previa aparecerá aquí.</div>
        ) : (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-3">
              <p className="font-serif text-[1.5rem]">{fileName}</p>
              <p className="font-mono text-xs text-muted" data-testid="import-summary">
                {result.rows.length} filas válidas · {result.errors.length} con errores
              </p>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-danger">
                {result.errors.slice(0, 8).map((e) => <li key={`${e.row}-${e.message}`}>Fila {e.row}: {e.message}</li>)}
              </ul>
            )}
            <div className="mt-3 max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-paper font-mono text-[11px] text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 font-normal">Ubicación</th>
                    <th className="py-2 font-normal">Cód.</th>
                    <th className="py-2 font-normal">Medidas</th>
                    <th className="py-2 text-right font-normal">Cant.</th>
                    <th className="py-2 pl-4 font-normal">Producto</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className="py-1.5">{[r.building, r.floor, r.room].filter(Boolean).join(" · ")}</td>
                      <td className="py-1.5 font-mono text-xs">{r.code || "—"}</td>
                      <td className="py-1.5 font-mono text-xs">{formatMeters(r.width)} × {formatMeters(r.height)}</td>
                      <td className="py-1.5 text-right font-mono text-xs">{r.quantity}</td>
                      <td className="py-1.5 pl-4 text-muted">{r.product || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className={btnPrimary}
                disabled={!result.rows.length || ctx.busy || ctx.readOnly}
                onClick={async () => {
                  const r = await ctx.act(commitImport(ctx.data.project.id, result.rows), `${result.rows.length} filas importadas.`);
                  if (r) {
                    setResult(null);
                    setFileName("");
                    onImported();
                  }
                }}
              >
                Importar {result.rows.length} filas
              </button>
              <button type="button" className={btnLine} onClick={() => setResult(null)}>Descartar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
