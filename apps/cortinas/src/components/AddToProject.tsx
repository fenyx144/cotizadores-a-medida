"use client";
/** Formulario de la ficha de producto para sumar este producto a un proyecto en borrador. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Drive } from "@portafolio/core/pricing";
import { addFromCatalog } from "@/app/actions/project";
import { DRIVE_LABELS } from "@/lib/content";

const input = "w-full border-b border-line bg-transparent py-1.5 outline-none focus:border-ink";
const label = "block font-mono text-[11px] text-muted";

interface Props {
  model: { id: number; name: string; minWidth: number; maxWidth: number; minHeight: number; maxHeight: number };
  fabrics: { id: number; name: string }[];
  projects: { id: number; name: string }[];
}

export function AddToProject({ model, fabrics, projects }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [fabricId, setFabricId] = useState(fabrics[0]?.id ?? 0);
  const [drive, setDrive] = useState<Drive>("manual");
  const [width, setWidth] = useState("150");
  const [height, setHeight] = useState("150");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!projects.length) {
    return (
      <p className="mt-3 text-muted">
        No tiene proyectos en borrador. <Link href="/cliente" className="text-ink underline decoration-accent underline-offset-4">Cree uno</Link> y vuelva a esta ficha.
      </p>
    );
  }

  async function submit() {
    setPending(true);
    const r = await addFromCatalog(projectId, { modelId: model.id, fabricId, drive, width: Number(width), height: Number(height), quantity: Number(quantity) || 1 });
    setPending(false);
    if (!r.ok) return setError(r.error);
    router.push(`/proyecto/${projectId}?tab=ubicaciones`);
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
      <label className="col-span-2"><span className={label}>Proyecto</span>
        <select className={input} value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label><span className={label}>Tela</span>
        <select className={input} value={fabricId} onChange={(e) => setFabricId(Number(e.target.value))}>
          {fabrics.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
      <label><span className={label}>Accionamiento</span>
        <select className={input} value={drive} onChange={(e) => setDrive(e.target.value as Drive)}>
          {(Object.keys(DRIVE_LABELS) as Drive[]).map((d) => <option key={d} value={d}>{DRIVE_LABELS[d]}</option>)}
        </select>
      </label>
      <label><span className={label}>Ancho (cm) · {model.minWidth}–{model.maxWidth}</span><input className={`${input} font-mono`} value={width} onChange={(e) => setWidth(e.target.value.replace(/\D/g, ""))} /></label>
      <label><span className={label}>Alto (cm) · {model.minHeight}–{model.maxHeight}</span><input className={`${input} font-mono`} value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))} /></label>
      <label><span className={label}>Cantidad</span><input className={`${input} font-mono`} value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} /></label>
      <div className="col-span-2">
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <button type="button" disabled={pending} onClick={submit} className="bg-blue px-5 py-3 text-white-stone hover:bg-ink disabled:opacity-50">
          {pending ? "Agregando…" : "Agregar al proyecto"}
        </button>
      </div>
    </div>
  );
}
