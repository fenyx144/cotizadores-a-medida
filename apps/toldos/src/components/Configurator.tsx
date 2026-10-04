"use client";
/**
 * Configurador: el cliente elige modelo, medidas, lona, color y motor.
 * - El dibujo SVG y el precio se recalculan en cada cambio (useMemo).
 * - Las reglas de medidas y de precio vienen del panel de administración.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculatePrice, clampToStep, DRIVE_LABELS, formatMoney, formatMeters, validateDimensions, type Configuration, type Drive } from "@portafolio/core/pricing";
import type { Catalog } from "@/lib/catalog";
import { saveConfig, useSavedConfig } from "@/lib/saved-config";
import { projectionLabel, TYPE_LABELS } from "@/lib/content";
import { AwningPreview } from "./AwningPreview";
import { FabricSwatch } from "./FabricSwatch";

const DRIVE_NOTES: Record<Drive, string> = {
  manual: "Con manivela. Sencillo y sin cables.",
  motor: "Se abre y cierra con un mando o desde el móvil.",
  sensor: "Se recoge solo si sopla fuerte y se abre con el sol.",
};

/** Configuración inicial: la de la URL, la guardada o una por defecto. */
function initialConfig(catalog: Catalog, params: { modelo?: string; lona?: string }): Configuration {
  const model = catalog.models.find((m) => m.slug === params.modelo) ?? catalog.models.find((m) => m.type === "cofre") ?? catalog.models[0];
  const fabricId = Number(params.lona) || catalog.fabrics[0]?.id;
  return {
    modelId: model.id,
    width: clampToStep(450, model.minWidth, model.maxWidth),
    projection: clampToStep(300, model.minProjection, Math.min(model.maxProjection, 450)),
    fabricId: catalog.fabrics.some((f) => f.id === fabricId) ? fabricId : catalog.fabrics[0].id,
    frameColorId: catalog.frameColors[0].id,
    drive: "motor",
  };
}

export function Configurator({ catalog, params }: { catalog: Catalog; params: { modelo?: string; lona?: string } }) {
  const router = useRouter();
  const saved = useSavedConfig();
  // "edited" guarda los cambios del cliente; mientras no toque nada mostramos
  // lo que había guardado antes (si no viene un modelo/lona en la URL) o un diseño por defecto.
  const [edited, setConfig] = useState<Configuration | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const useSaved = saved && !params.modelo && !params.lona && catalog.models.some((m) => m.id === saved.modelId);
  const config: Configuration = edited ?? (useSaved ? saved : initialConfig(catalog, params));

  const model = catalog.models.find((m) => m.id === config.modelId)!;
  const fabric = catalog.fabrics.find((f) => f.id === config.fabricId)!;
  const frame = catalog.frameColors.find((c) => c.id === config.frameColorId)!;

  const errors = validateDimensions(model, config.width, config.projection);
  const price = calculatePrice(config, { model, fabric, frameColor: frame, rules: catalog.rules });

  /** Al cambiar de modelo, ajustamos las medidas a sus mínimos y máximos. */
  function selectModel(id: number) {
    const m = catalog.models.find((x) => x.id === id)!;
    const width = clampToStep(config.width, m.minWidth, m.maxWidth);
    let projection = clampToStep(config.projection, m.minProjection, m.maxProjection);
    if ((m.type === "retractil" || m.type === "cofre") && projection > width) projection = clampToStep(width, m.minProjection, m.maxProjection);
    setConfig({ ...config, modelId: id, width, projection });
  }

  function go(path: string) {
    saveConfig(config);
    router.push(path);
  }

  const collections = Array.from(new Set(catalog.fabrics.map((f) => f.collection)));
  const pLabel = projectionLabel(model.type);

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      {/* ---------- Vista previa + precio (fija al hacer scroll) ---------- */}
      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-24">
          <div className="bg-paper-deep/60">
            <AwningPreview type={model.type} width={config.width} projection={config.projection} fabric={fabric} frameHex={frame.hex} drive={config.drive} className="block w-full" />
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
            <div>
              <p className="text-sm text-muted">Precio orientativo, instalación incluida</p>
              <p className="font-serif text-5xl" aria-live="polite">
                <span className="text-2xl text-muted">desde </span>
                {formatMoney(price.total)}
              </p>
            </div>
            <button onClick={() => setShowBreakdown(!showBreakdown)} className="link-grow text-sm text-muted">
              {showBreakdown ? "Ocultar desglose" : "Ver desglose"}
            </button>
          </div>
          {showBreakdown && (
            <ul className="mt-4 space-y-1 text-sm">
              {price.lines.map((l) => (
                <li key={l.label} className="flex justify-between border-b border-line/60 py-1.5">
                  <span className="text-muted">{l.label}</span>
                  <span>{formatMoney(l.amount)}</span>
                </li>
              ))}
              <li className="pt-2 text-xs text-muted">El precio final se confirma tras la visita de medición.</li>
            </ul>
          )}
        </div>
      </div>

      {/* ---------- Opciones ---------- */}
      <div className="lg:col-span-5">
        <Step n={1} title="Modelo">
          <div className="grid grid-cols-2 gap-px bg-line">
            {catalog.models.map((m) => (
              <button
                key={m.id}
                onClick={() => selectModel(m.id)}
                className={`bg-paper p-4 text-left transition-colors last:odd:col-span-2 ${m.id === config.modelId ? "bg-paper-deep" : "hover:bg-paper-deep/50"}`}
                aria-pressed={m.id === config.modelId}
              >
                <span className="block font-serif text-xl">{m.name}</span>
                <span className="text-sm text-muted">{TYPE_LABELS[m.type]}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Medidas">
          <RangeRow label="Ancho" value={config.width} min={model.minWidth} max={model.maxWidth} onChange={(v) => setConfig({ ...config, width: v })} />
          <RangeRow label={pLabel} value={config.projection} min={model.minProjection} max={model.maxProjection} onChange={(v) => setConfig({ ...config, projection: v })} />
          <p className="mt-3 text-sm text-muted">
            {price.area.toString().replace(".", ",")} m² de sombra
          </p>
          {errors.map((e) => (
            <p key={e} className="mt-2 text-sm text-terracotta">{e}</p>
          ))}
        </Step>

        <Step n={3} title="Lona" aside={fabric.name}>
          {collections.map((col) => (
            <div key={col} className="mb-4">
              <p className="mb-2 text-xs text-muted">{col}</p>
              <div className="flex flex-wrap gap-3">
                {catalog.fabrics
                  .filter((f) => f.collection === col)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setConfig({ ...config, fabricId: f.id })}
                      title={f.name}
                      aria-label={f.name}
                      aria-pressed={f.id === config.fabricId}
                      className={`h-11 w-11 overflow-hidden rounded-full ring-offset-2 ring-offset-paper transition ${f.id === config.fabricId ? "ring-1 ring-ink" : "hover:scale-105"}`}
                    >
                      <FabricSwatch hex={f.hex} pattern={f.pattern} stripeHex={f.stripeHex} className="h-full w-full" />
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <Link href="/muestrario" className="link-grow text-sm text-muted">Ver el muestrario completo</Link>
        </Step>

        <Step n={4} title="Estructura" aside={`${frame.name} · ${frame.ral}`}>
          <div className="flex flex-wrap gap-3">
            {catalog.frameColors.map((c) => (
              <button
                key={c.id}
                onClick={() => setConfig({ ...config, frameColorId: c.id })}
                title={c.name}
                aria-label={c.name}
                aria-pressed={c.id === config.frameColorId}
                className={`h-9 w-9 rounded-full border border-line ring-offset-2 ring-offset-paper transition ${c.id === config.frameColorId ? "ring-1 ring-ink" : "hover:scale-105"}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </Step>

        <Step n={5} title="Accionamiento">
          <div className="divide-y divide-line border-y border-line">
            {(Object.keys(DRIVE_LABELS) as Drive[]).map((d) => (
              <label key={d} className="flex cursor-pointer items-start gap-3 py-3">
                <input type="radio" name="drive" checked={config.drive === d} onChange={() => setConfig({ ...config, drive: d })} className="mt-1.5 accent-ink" />
                <span>
                  <span className="block">{DRIVE_LABELS[d]}</span>
                  <span className="text-sm text-muted">{DRIVE_NOTES[d]}</span>
                </span>
              </label>
            ))}
          </div>
        </Step>

        <div className="mt-10 space-y-4">
          <button disabled={errors.length > 0} onClick={() => go("/solicitar-visita")} className="w-full bg-ink px-6 py-4 text-paper transition-colors hover:bg-terracotta disabled:opacity-40">
            Pedir visita con este diseño
          </button>
          <button onClick={() => go("/pruebalo")} className="w-full border border-ink px-6 py-4 transition-colors hover:bg-ink hover:text-paper">
            Probarlo sobre una foto de mi casa
          </button>
          <p className="text-center text-sm text-muted">
            {model.name}, {formatMeters(config.width)} × {formatMeters(config.projection)}, {fabric.name.toLowerCase()}, {DRIVE_LABELS[config.drive].toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-7 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl">
          <span className="mr-3 text-base text-terracotta">{String(n).padStart(2, "0")}</span>
          {title}
        </h2>
        {aside && <span className="text-sm text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function RangeRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between">
        <span className="text-muted">{label}</span>
        <span className="font-serif text-xl">{formatMeters(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full" aria-label={label} />
      <div className="flex justify-between text-xs text-muted">
        <span>{formatMeters(min)}</span>
        <span>{formatMeters(max)}</span>
      </div>
    </div>
  );
}
