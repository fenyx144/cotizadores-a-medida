"use client";
/**
 * Configurador de la ficha de producto: aplica el motor de reglas en vivo
 * (opciones bloqueadas con motivo, límites de medidas) y suma el producto a un proyecto en borrador.
 */
import { SHOW_PRICES } from "@/lib/flags";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@portafolio/core/pricing";
import { addFromCatalog } from "@/app/actions/project";
import { priceLine, type CatalogData } from "@/lib/line-price";
import { evaluate, withDefaults, type Values } from "@/lib/rules";
import { AttributeFields } from "./AttributeFields";
import { VariantPicker } from "./VariantPicker";

const input = "w-full border-b border-line bg-transparent py-1.5 outline-none focus:border-ink";
const label = "block font-mono text-[11px] text-muted";

interface Props {
  modelId: number;
  slug: string;
  catalog: CatalogData;
  projects: { id: number; name: string }[];
  loggedIn: boolean; particular?: boolean;
}

export function AddToProject({ modelId, slug, catalog, projects, loggedIn, particular }: Props) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [picked, setPicked] = useState<Values>({});
  const [width, setWidth] = useState("150");
  const [height, setHeight] = useState("150");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Valores efectivos: lo elegido + el primer valor disponible donde falte o ya no aplique.
  const values = withDefaults(catalog, { modelId, values: picked });
  const w = Number(width), h = Number(height);
  const ev = evaluate(catalog, { modelId, values, width: w, height: h });
  const errors = Object.values(ev.errors).filter(Boolean);
  const price = !errors.length ? priceLine(catalog, { modelId, values, width: w, height: h }) : null;
  const qty = Math.max(1, Number(quantity) || 1);

  async function submit() {
    setPending(true);
    const r = await addFromCatalog(projectId, { modelId, values, width: w, height: h, quantity: qty });
    setPending(false);
    if (!r.ok) return setError(r.error);
    router.push(`/proyecto/${projectId}?tab=ubicaciones`);
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4" data-testid="configurator">
      <VariantPicker catalog={catalog} modelId={modelId} values={values} className={input} labelClass={label} onPick={(v) => setPicked({ ...values, ...v })} />
      <AttributeFields ev={ev} values={values} inputClass={input} labelClass={label} onChange={(id, v) => setPicked({ ...values, [id]: v })} />
      <label><span className={`${label} flex justify-between`}>Ancho (cm)<span className="font-mono" data-testid="range-width">{ev.limits.minWidth}–{ev.limits.maxWidth}</span></span><input className={`${input} font-mono ${ev.errors.width ? "border-danger" : ""}`} value={width} onChange={(e) => setWidth(e.target.value.replace(/\D/g, ""))} name="width" /></label>
      <label><span className={`${label} flex justify-between`}>Alto (cm)<span className="font-mono" data-testid="range-height">{ev.limits.minHeight}–{ev.limits.maxHeight}</span></span><input className={`${input} font-mono ${ev.errors.height ? "border-danger" : ""}`} value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))} name="height" /></label>
      {(ev.errors.width || ev.errors.height) && <p className="col-span-2 -mt-2 text-sm text-danger" data-testid="dim-error">{ev.errors.width ?? ev.errors.height}</p>}
      <label><span className={label}>Cantidad</span><input className={`${input} font-mono`} value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} name="quantity" /></label>
      {SHOW_PRICES && <div className="text-right">
        <p className={label}>Precio con IGV × {qty}</p>
        <p className="font-serif text-[1.8rem] leading-none" data-testid="config-price">{price ? formatMoney(price.unitPrice * qty) : "—"}</p>
      </div>}

      <div className="col-span-2 border-t border-line pt-4">
        {!loggedIn ? (
          <p className="text-muted">
            <Link href={`/cliente/ingresar?next=/catalogo/${slug}`} className="text-ink underline decoration-accent underline-offset-4">Ingrese</Link> o{" "}
            <Link href="/cliente/registro" className="text-ink underline decoration-accent underline-offset-4">cree una cuenta</Link> para agregar esta configuración a un proyecto.
          </p>
        ) : particular ? (
          <p className="text-muted"><Link href="/cliente" className="text-ink underline decoration-accent underline-offset-4">Pida su cotización</Link> desde su área de cliente con estas medidas.</p>
        ) : !projects.length ? (
          <p className="text-muted">No tiene proyectos en borrador. <Link href="/cliente" className="text-ink underline decoration-accent underline-offset-4">Cree uno</Link> y vuelva a esta ficha.</p>
        ) : (
          <div className="grid grid-cols-2 items-end gap-5">
            <label><span className={label}>Proyecto</span>
              <select className={input} value={projectId} onChange={(e) => setProjectId(Number(e.target.value))} name="projectId">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div>
              {error && <p className="mb-3 text-sm text-danger">{error}</p>}
              <button type="button" disabled={pending || errors.length > 0} onClick={submit} className="bg-blue px-5 py-3 text-white-stone hover:bg-ink disabled:opacity-50">
                {pending ? "Agregando…" : "Agregar al proyecto"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
