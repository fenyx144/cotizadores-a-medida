"use client";
/**
 * Página "Pruébalo en tu casa": recupera la configuración guardada y la
 * coloca sobre la foto con el componente reutilizable PerspectiveOverlay.
 */
import Link from "next/link";
import { PerspectiveOverlay } from "@portafolio/core/ui/PerspectiveOverlay";
import type { Configuration } from "@portafolio/core/pricing";
import type { Quad } from "@portafolio/core/perspective";
import type { Catalog } from "@/lib/catalog";
import { saveConfig, useSavedConfig } from "@/lib/saved-config";
import { TYPE_LABELS } from "@/lib/content";
import { AwningPreview, overlayAspect } from "./AwningPreview";
import { FabricSwatch } from "./FabricSwatch";

// Esquinas iniciales pensadas para la foto de ejemplo (puerta de la planta baja).
const DEMO_QUAD: Quad = [
  { x: 0.27, y: 0.335 },
  { x: 0.73, y: 0.335 },
  { x: 0.81, y: 0.545 },
  { x: 0.19, y: 0.545 },
];

export function OverlayStudio({ catalog }: { catalog: Catalog }) {
  const fallback = catalog.models.find((m) => m.type === "cofre") ?? catalog.models[0];
  // La configuración guardada es la "fuente de verdad"; si no hay, usamos una de ejemplo.
  const saved = useSavedConfig();
  const config: Configuration =
    saved && catalog.models.some((m) => m.id === saved.modelId)
      ? saved
      : {
          modelId: fallback.id,
          width: 450,
          projection: 300,
          fabricId: (catalog.fabrics.find((f) => f.pattern === "rayas") ?? catalog.fabrics[0]).id,
          frameColorId: catalog.frameColors[0].id,
          drive: "motor",
        };

  const model = catalog.models.find((m) => m.id === config.modelId) ?? fallback;
  const fabric = catalog.fabrics.find((f) => f.id === config.fabricId) ?? catalog.fabrics[0];
  const frame = catalog.frameColors.find((c) => c.id === config.frameColorId) ?? catalog.frameColors[0];

  function update(patch: Partial<Configuration>) {
    saveConfig({ ...config, ...patch });
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <PerspectiveOverlay
          key={model.type /* reinicia las esquinas si cambia la forma */}
          defaultPhoto="/img/fachada-demo.webp"
          defaultQuad={DEMO_QUAD}
          overlayAspect={overlayAspect(model.type, config.width, config.projection)}
          overlay={<AwningPreview mode="overlay" type={model.type} width={config.width} projection={config.projection} fabric={fabric} frameHex={frame.hex} drive={config.drive} className="block h-full w-full" />}
          downloadName="sunshade-mi-terraza.jpg"
        />
      </div>
      <aside className="lg:col-span-4 lg:col-start-9">
        <ol className="space-y-4 border-b border-line pb-8 text-muted">
          <li><span className="mr-3 font-serif text-terracotta">1</span>Sube una foto de frente de tu fachada o terraza.</li>
          <li><span className="mr-3 font-serif text-terracotta">2</span>Arrastra los cuatro puntos hasta donde iría el toldo.</li>
          <li><span className="mr-3 font-serif text-terracotta">3</span>Descarga la imagen y compártela en casa.</li>
        </ol>
        <p className="mt-6 text-xs text-muted">La foto no sale de tu dispositivo: todo se hace en el navegador.</p>

        <div className="mt-8">
          <p className="text-sm text-muted">Modelo</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {catalog.models.map((m) => (
              <button key={m.id} onClick={() => update({ modelId: m.id, width: Math.min(Math.max(config.width, m.minWidth), m.maxWidth), projection: Math.min(Math.max(config.projection, m.minProjection), m.maxProjection) })} className={`font-serif text-xl ${m.id === model.id ? "text-ink underline decoration-terracotta underline-offset-4" : "text-muted hover:text-ink"}`}>
                {m.name}
              </button>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted">{TYPE_LABELS[model.type]}</p>
        </div>

        <div className="mt-8">
          <p className="text-sm text-muted">Lona · <span className="text-ink">{fabric.name}</span></p>
          <div className="mt-3 flex flex-wrap gap-3">
            {catalog.fabrics.map((f) => (
              <button key={f.id} onClick={() => update({ fabricId: f.id })} aria-label={f.name} title={f.name} className={`h-9 w-9 overflow-hidden rounded-full ring-offset-2 ring-offset-paper ${f.id === fabric.id ? "ring-1 ring-ink" : ""}`}>
                <FabricSwatch hex={f.hex} pattern={f.pattern} stripeHex={f.stripeHex} className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Link href="/solicitar-visita" className="block bg-ink px-6 py-4 text-center text-paper transition-colors hover:bg-terracotta">Pedir visita con este diseño</Link>
          <Link href="/configurador" className="block text-center text-sm text-muted underline underline-offset-4 hover:text-ink">Cambiar medidas en el configurador</Link>
        </div>
      </aside>
    </div>
  );
}
