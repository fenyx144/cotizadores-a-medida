"use client";
/**
 * Subida de plano o foto. Si es PDF, lo convertimos a PNG en el navegador con
 * pdf.js (primera página, a alta resolución), así el servidor solo guarda
 * imágenes y el visor no necesita entender PDF.
 */
import { useState } from "react";
import { uploadPlan } from "@/app/actions/project";
import { btnPrimary, inputCls, labelCls, locName, type EditorContext } from "./shared";

const MAX_SIDE = 6000; // px del lado mayor tras convertir

/** Renderiza la primera página del PDF en un canvas y devuelve un PNG. */
async function pdfToPng(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(MAX_SIDE / Math.max(base.width, base.height), 4);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo convertir"))), "image/png"));
  return { blob, width: canvas.width, height: canvas.height };
}

/** Normaliza una imagen: lee su tamaño y, si no es JPG/PNG (p. ej. WEBP), la pasa a JPG. */
async function normalizeImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (file.type === "image/png" || file.type === "image/jpeg") return { blob: file, width, height };
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.88));
  return { blob, width, height };
}

export function PlanUpload({ ctx, onUploaded }: { ctx: EditorContext; onUploaded: (planId: number) => void }) {
  const [kind, setKind] = useState<"plano" | "foto">("plano");
  const [locationId, setLocationId] = useState<number>(ctx.data.locations[0]?.id ?? 0);
  const [status, setStatus] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      setStatus(isPdf ? "Convirtiendo el PDF a imagen…" : "Preparando la imagen…");
      const img = isPdf ? await pdfToPng(file) : await normalizeImage(file);
      setStatus("Subiendo…");
      const fd = new FormData();
      const type = img.blob.type || "image/png";
      fd.set("file", new File([img.blob], file.name.replace(/\.\w+$/, type === "image/png" ? ".png" : ".jpg"), { type }));
      fd.set("width", String(img.width));
      fd.set("height", String(img.height));
      fd.set("kind", kind);
      fd.set("name", file.name.replace(/\.\w+$/, ""));
      if (kind === "foto") fd.set("locationId", String(locationId));
      const r = await ctx.act(uploadPlan(ctx.data.project.id, fd), kind === "foto" ? "Foto subida." : "Plano subido.");
      setStatus(null);
      if (r?.createdId) onUploaded(r.createdId);
    } catch (e) {
      console.error(e);
      setStatus("No se pudo leer el archivo. Pruebe con otro PDF o una imagen.");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
      <label>
        <span className={labelCls}>Tipo</span>
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as "plano" | "foto")} aria-label="Tipo de archivo">
          <option value="plano">Plano del proyecto</option>
          <option value="foto">Foto de una ubicación</option>
        </select>
      </label>
      {kind === "foto" ? (
        <label>
          <span className={labelCls}>Ubicación</span>
          <select className={inputCls} value={locationId} onChange={(e) => setLocationId(Number(e.target.value))}>
            {ctx.data.locations.map((l) => <option key={l.id} value={l.id}>{locName(l)}</option>)}
          </select>
        </label>
      ) : (
        <p className="text-sm text-muted">PDF (primera página), PNG o JPG. Hasta 15 MB.</p>
      )}
      <label className={`${btnPrimary} cursor-pointer text-center`}>
        {status ?? "Elegir archivo"}
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" disabled={!!status || ctx.busy} onChange={(e) => onFile(e.target.files?.[0])} data-testid="plan-file" />
      </label>
    </div>
  );
}
