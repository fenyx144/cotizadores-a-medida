"use client";
/** Muestrario interactivo de lonas: eliges una y la ves puesta en un toldo. */
import { useState } from "react";
import Link from "next/link";
import type { Catalog } from "@/lib/catalog";
import { AwningPreview } from "./AwningPreview";
import { FabricSwatch } from "./FabricSwatch";

export function SwatchBook({ fabrics }: { fabrics: Catalog["fabrics"] }) {
  const [selectedId, setSelectedId] = useState(fabrics[0]?.id);
  const selected = fabrics.find((f) => f.id === selectedId) ?? fabrics[0];
  const collections = Array.from(new Set(fabrics.map((f) => f.collection)));

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-6">
        {collections.map((col) => (
          <section key={col} className="mb-12">
            <h2 className="border-b border-line pb-3 text-2xl">{col}</h2>
            <div className="mt-6 grid grid-cols-3 gap-5">
              {fabrics
                .filter((f) => f.collection === col)
                .map((f) => (
                  <button key={f.id} onClick={() => setSelectedId(f.id)} className="group text-left" aria-pressed={f.id === selected.id}>
                    <div className={`aspect-square overflow-hidden transition duration-500 group-hover:-translate-y-1 ${f.id === selected.id ? "outline outline-1 outline-offset-4 outline-ink" : ""}`}>
                      <FabricSwatch hex={f.hex} pattern={f.pattern} stripeHex={f.stripeHex} className="h-full w-full" />
                    </div>
                    <p className="mt-3 text-sm">{f.name}</p>
                    <p className="text-xs text-muted">{f.code}</p>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
      <div className="lg:col-span-5 lg:col-start-8">
        <div className="lg:sticky lg:top-24">
          <div key={selected.id} className="animate-rise bg-paper-deep/60">
            <AwningPreview type="retractil" width={420} projection={300} fabric={selected} frameHex="#F0EFEA" drive="manual" showDims={false} className="block w-full" />
          </div>
          <div className="mt-6 flex items-baseline justify-between border-b border-line pb-4">
            <h3 className="text-3xl">{selected.name}</h3>
            <span className="text-sm text-muted">{selected.code}</span>
          </div>
          <dl className="divide-y divide-line text-sm">
            <div className="flex justify-between py-2.5"><dt className="text-muted">Colección</dt><dd>{selected.collection}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Tejido</dt><dd>Acrílico tintado en masa, 300 g/m²</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Suplemento</dt><dd>{selected.surchargePerM2 ? `${selected.surchargePerM2} € / m²` : "Sin suplemento"}</dd></div>
          </dl>
          <Link href={`/configurador?lona=${selected.id}`} className="mt-8 inline-block bg-ink px-6 py-3 text-paper transition-colors hover:bg-terracotta">Usar esta lona</Link>
          <p className="mt-4 text-sm text-muted">¿Prefieres tocarla? Llevamos el muestrario físico a la visita.</p>
        </div>
      </div>
    </div>
  );
}
