"use client";
/** Diálogos con estilo en lugar de confirm()/alert(): `await ask({...})` devuelve true/false. Requiere <DialogHost /> una vez en el layout. */
import { useEffect, useRef, useState } from "react";

export interface AskOptions { title: string; text?: string; ok?: string; cancel?: string | null; danger?: boolean }
type Pending = AskOptions & { resolve: (v: boolean) => void };
let push: ((p: Pending) => void) | null = null;

export function ask(o: AskOptions): Promise<boolean> {
  return new Promise((resolve) => (push ? push({ ...o, resolve }) : resolve(window.confirm(o.title))));
}
export const notify = (title: string, text?: string) => ask({ title, text, ok: "Aceptar", cancel: null }).then(() => undefined);

export function DialogHost() {
  const [p, setP] = useState<Pending | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { push = setP; return () => { push = null; }; }, []);
  useEffect(() => { if (p) okRef.current?.focus(); }, [p]);
  if (!p) return null;
  const close = (v: boolean) => { p.resolve(v); setP(null); };
  return (
    <div className="fixed inset-0 z-[3000] grid place-items-center bg-ink/40 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && close(false)}
      onKeyDown={(e) => e.key === "Escape" && close(false)} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md border border-line bg-paper p-6 shadow-xl" data-testid="dialog">
        <h2 id="dlg-title" className="text-[1.6rem] leading-tight">{p.title}</h2>
        {p.text && <p className="mt-2 text-[0.95rem] text-muted">{p.text}</p>}
        <div className="mt-6 flex justify-end gap-3">
          {p.cancel !== null && <button type="button" className="border border-line px-4 py-2 text-sm hover:border-ink" onClick={() => close(false)}>{p.cancel ?? "Cancelar"}</button>}
          <button ref={okRef} type="button" data-testid="dialog-ok" className={`px-4 py-2 text-sm text-white ${p.danger ? "bg-danger" : "bg-ink"}`} onClick={() => close(true)}>{p.ok ?? "Aceptar"}</button>
        </div>
      </div>
    </div>
  );
}
