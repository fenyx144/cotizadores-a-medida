"use client";
/**
 * "Pruébalo en tu casa": superpone un dibujo (SVG) sobre una foto y permite
 * arrastrar sus 4 esquinas para ajustarlo a la perspectiva de la fachada.
 * Todo ocurre en el navegador: la foto nunca se sube al servidor.
 *
 * - Vista previa: CSS `matrix3d` calculado con una homografía (rápido, GPU).
 * - Descarga: dibujamos la foto y el SVG deformado en un <canvas> y lo
 *   exportamos como JPG.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { drawWarped, homography, toCssMatrix3d, type Point, type Quad } from "../perspective";

export interface PerspectiveOverlayProps {
  /** Foto de ejemplo que se muestra antes de que el usuario suba la suya. */
  defaultPhoto: string;
  /** El dibujo a superponer: debe ser un único <svg>. */
  overlay: ReactNode;
  /** Proporción ancho/alto del dibujo. */
  overlayAspect: number;
  /** Esquinas iniciales, en proporción (0–1) respecto a la foto. */
  defaultQuad?: Quad;
  downloadName?: string;
}

const BASE_W = 400; // tamaño "de trabajo" del dibujo antes de deformarlo

const DEFAULT_QUAD: Quad = [
  { x: 0.25, y: 0.3 },
  { x: 0.75, y: 0.3 },
  { x: 0.8, y: 0.55 },
  { x: 0.2, y: 0.55 },
];

export function PerspectiveOverlay({ defaultPhoto, overlay, overlayAspect, defaultQuad = DEFAULT_QUAD, downloadName = "mi-terraza.jpg" }: PerspectiveOverlayProps) {
  const [photo, setPhoto] = useState(defaultPhoto);
  const [quad, setQuad] = useState<Quad>(defaultQuad);
  const [opacity, setOpacity] = useState(0.95);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);

  const baseH = BASE_W / overlayAspect;

  // Medimos el contenedor para pasar de proporciones (0–1) a píxeles.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toPx = (q: Quad, w: number, h: number) => q.map((p) => ({ x: p.x * w, y: p.y * h })) as Quad;

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIndex.current === null || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const p: Point = {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
    setQuad((q) => q.map((old, i) => (i === dragIndex.current ? p : old)) as Quad);
  }, []);

  function onUpload(file: File | undefined) {
    if (!file) return;
    if (photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(file));
  }

  async function download() {
    const svg = overlayRef.current?.querySelector("svg");
    if (!svg) return;
    setBusy(true);
    try {
      // 1) Cargamos la foto a tamaño real.
      const img = await loadImage(photo);
      const W = img.naturalWidth, H = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // 2) Pasamos el SVG a imagen, con buena resolución.
      const sw = 1600, sh = Math.round(1600 / overlayAspect);
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(sw));
      clone.setAttribute("height", String(sh));
      const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const svgImg = await loadImage(url);
      const raster = document.createElement("canvas");
      raster.width = sw;
      raster.height = sh;
      raster.getContext("2d")!.drawImage(svgImg, 0, 0, sw, sh);
      URL.revokeObjectURL(url);

      // 3) Lo dibujamos deformado sobre las esquinas elegidas.
      ctx.globalAlpha = opacity;
      drawWarped(ctx, raster, sw, sh, toPx(quad, W, H));

      // 4) Descargamos.
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.9);
      a.download = downloadName;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  const px = toPx(quad, size.w, size.h);
  const transform = size.w ? toCssMatrix3d(homography(BASE_W, baseH, px)) : undefined;

  return (
    <div>
      <div
        ref={boxRef}
        className="relative w-full touch-none select-none overflow-hidden bg-ink/5"
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragIndex.current = null)}
        onPointerLeave={() => (dragIndex.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="Tu fachada" className="block w-full" draggable={false} />
        <div
          ref={overlayRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: BASE_W, height: baseH, transformOrigin: "0 0", transform, opacity, visibility: transform ? "visible" : "hidden" }}
        >
          {overlay}
        </div>
        {/* Contorno y asas para arrastrar */}
        {size.w > 0 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <polygon points={px.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="white" strokeWidth={1} strokeDasharray="4 4" opacity={0.9} />
          </svg>
        )}
        {px.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Mover esquina ${i + 1}`}
            onPointerDown={(e) => {
              dragIndex.current = i;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragIndex.current = null)}
            className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-ink/40 shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:cursor-grabbing"
            style={{ left: p.x, top: p.y }}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
        <label className="cursor-pointer bg-ink px-5 py-3 text-paper hover:bg-ink/85">
          Subir mi foto
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={download} disabled={busy} className="border border-ink px-5 py-3 hover:bg-ink hover:text-paper disabled:opacity-50">
          {busy ? "Preparando…" : "Descargar imagen"}
        </button>
        <button type="button" onClick={() => setQuad(defaultQuad)} className="text-muted underline underline-offset-4 hover:text-ink">
          Recolocar
        </button>
        <label className="flex items-center gap-3 text-muted">
          Transparencia
          <input type="range" min={0.5} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="accent-ink" />
        </label>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
