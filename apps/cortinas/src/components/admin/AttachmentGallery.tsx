"use client";
/** Adjuntos del proyecto en el admin: miniaturas + visor en ventana modal (imágenes con anterior/siguiente, PDF embebido). */
import { useCallback, useEffect, useState } from "react";

export interface AttachmentItem { id: number; name: string; contentType: string; size: number; createdAt: string }

const url = (id: number) => `/api/adjuntos/${id}`;
const isImg = (a: AttachmentItem) => a.contentType.startsWith("image/");

export function AttachmentGallery({ items }: { items: AttachmentItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i == null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, go]);

  if (!items.length) return <p className="mt-2 text-sm text-muted">El cliente no adjuntó archivos.</p>;
  const cur = open == null ? null : items[open];

  return (
    <>
      <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((a, i) => (
          <li key={a.id} className="text-sm">
            <button type="button" onClick={() => setOpen(i)} className="block aspect-[4/3] w-full overflow-hidden border border-line bg-white-stone hover:border-ink" aria-label={`Ver ${a.name}`} data-testid="attachment-thumb">
              {isImg(a) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url(a.id)} alt={a.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-1"><span className="font-serif text-3xl">PDF</span><span className="font-mono text-[11px] text-muted">Ver</span></span>
              )}
            </button>
            <p className="mt-2 truncate">{a.name}</p>
            <p className="font-mono text-[11px] text-muted">
              {Math.max(1, Math.round(a.size / 1024))} KB · {new Date(a.createdAt).toLocaleDateString("es-PE", { timeZone: "America/Lima" })} ·{" "}
              <button type="button" onClick={() => setOpen(i)} className="underline underline-offset-2 hover:text-ink">Ver</button> ·{" "}
              <a href={`${url(a.id)}?descargar=1`} className="underline underline-offset-2 hover:text-ink">Descargar</a>
            </p>
          </li>
        ))}
      </ul>

      {cur && (
        <div role="dialog" aria-modal="true" aria-label={cur.name} className="fixed inset-0 z-[2000] flex flex-col bg-ink/90 text-paper" onClick={() => setOpen(null)} data-testid="attachment-modal">
          <div className="flex items-center gap-4 px-5 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <p className="min-w-0 flex-1 truncate"><span className="font-mono text-[11px] opacity-70">{open! + 1} / {items.length} · </span>{cur.name}</p>
            <a href={`${url(cur.id)}?descargar=1`} className="border border-paper/40 px-3 py-1.5 hover:border-paper">Descargar</a>
            <a href={url(cur.id)} target="_blank" className="opacity-80 hover:opacity-100">Abrir en pestaña</a>
            <button type="button" onClick={() => setOpen(null)} className="px-2 text-2xl leading-none" aria-label="Cerrar">×</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            {isImg(cur) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={cur.id} src={url(cur.id)} alt={cur.name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            ) : (
              <object key={cur.id} data={url(cur.id)} type="application/pdf" className="h-full w-full max-w-5xl bg-white" onClick={(e) => e.stopPropagation()}>
                <iframe src={url(cur.id)} title={cur.name} className="h-full w-full bg-white" />
              </object>
            )}
            {items.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 px-2 text-4xl opacity-80 hover:opacity-100" aria-label="Anterior">‹</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-4xl opacity-80 hover:opacity-100" aria-label="Siguiente">›</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
