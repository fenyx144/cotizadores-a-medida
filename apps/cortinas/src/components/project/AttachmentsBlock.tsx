"use client";
/** Adjuntos del proyecto: fotos o PDF (especificaciones, fichas, fotos de obra). */
import { useRef } from "react";
import { deleteAttachment, uploadAttachment } from "@/app/actions/project";
import { btnLine, labelCls, type EditorContext } from "./shared";

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function AttachmentsBlock({ ctx }: { ctx: EditorContext }) {
  const { data, readOnly, busy, act } = ctx;
  const input = useRef<HTMLInputElement>(null);
  const files = data.attachments ?? [];

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    for (const f of list) {
      if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) { alert(`“${f.name}”: solo se aceptan fotos (JPG, PNG, WEBP) o PDF.`); continue; }
      if (f.size > 4 * 1024 * 1024) { alert(`“${f.name}” pesa ${(f.size / 1024 / 1024).toFixed(1)} MB y el máximo es 4 MB. Comprímalo (por ejemplo, exportando el PDF en calidad web) o envíe solo las páginas necesarias.`); continue; }
      const fd = new FormData();
      fd.set("file", f);
      await act(uploadAttachment(data.project.id, fd), "Archivo adjuntado.");
    }
    e.target.value = "";
  }

  return (
    <div data-testid="attachments">
      <h3 className="mt-10 text-[1.5rem]">Archivos adjuntos</h3>
      <p className="mt-1 text-sm text-muted">Fotos de las ventanas, especificaciones o fichas en PDF. Máx. 4 MB por archivo.</p>
      <ul className="mt-3 border-t border-line text-sm">
        {files.map((a) => (
          <li key={a.id} className="flex items-center gap-3 border-b border-line py-2">
            <span className="w-10 font-mono text-[11px] text-muted">{a.contentType === "application/pdf" ? "PDF" : "IMG"}</span>
            <a href={`/api/adjuntos/${a.id}`} target="_blank" className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">{a.name}</a>
            <span className="font-mono text-[11px] text-muted">{kb(a.size)}</span>
            {!readOnly && <button type="button" disabled={busy} onClick={() => act(deleteAttachment(data.project.id, a.id), "Adjunto eliminado.")} className="text-muted hover:text-danger" aria-label={`Quitar ${a.name}`}>×</button>}
          </li>
        ))}
        {files.length === 0 && <li className="border-b border-line py-2 text-muted">Sin archivos todavía.</li>}
      </ul>
      {!readOnly && (
        <div className="mt-3">
          <label className={labelCls} htmlFor="attach-input">Adjuntar archivo</label>
          <input id="attach-input" ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onPick} className="sr-only" />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`${btnLine} mt-1`}>Elegir fotos o PDF…</button>
        </div>
      )}
    </div>
  );
}
