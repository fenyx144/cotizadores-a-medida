import Image from "next/image";
import Link from "next/link";
import { formatMoney, formatMeters } from "@portafolio/core/pricing";
import { getCatalog } from "@/lib/catalog";
import { fromPrice } from "@/lib/price";
import { projectionLabel, TYPE_IMAGES, TYPE_LABELS } from "@/lib/content";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modelos — SunShade" };

export default async function ModelosPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-[1320px] px-5 pt-14 md:px-10">
      <div className="grid gap-4 md:grid-cols-12">
        <h1 className="text-5xl md:col-span-6 md:text-6xl">Modelos</h1>
        <p className="self-end text-muted md:col-span-4 md:col-start-9">Todos se fabrican a medida, con lona acrílica tintada en masa y estructura de aluminio lacado.</p>
      </div>

      <div className="mt-16">
        {catalog.models.map((m, i) => {
          const flip = i % 2 === 1;
          return (
            <section key={m.id} id={m.slug} className="grid scroll-mt-24 items-center gap-10 border-t border-line py-16 md:grid-cols-12">
              <Reveal className={`md:col-span-7 ${flip ? "md:order-2 md:col-start-6" : ""}`}>
                <div className="photo-zoom relative aspect-[4/3] overflow-hidden">
                  <Image src={m.image || TYPE_IMAGES[m.type]} alt={`${m.name}, ${TYPE_LABELS[m.type]}`} fill sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
                </div>
              </Reveal>
              <div className={`md:col-span-4 ${flip ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}>
                <p className="text-sm text-muted">{TYPE_LABELS[m.type]}</p>
                <h2 className="mt-2 text-5xl">{m.name}</h2>
                <p className="mt-4 font-serif text-xl italic text-muted">{m.tagline}</p>
                <p className="mt-4 text-muted">{m.description}</p>
                <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
                  <div className="flex justify-between py-2.5"><dt className="text-muted">Ancho</dt><dd>{formatMeters(m.minWidth)} – {formatMeters(m.maxWidth)}</dd></div>
                  <div className="flex justify-between py-2.5"><dt className="text-muted">{projectionLabel(m.type)}</dt><dd>{formatMeters(m.minProjection)} – {formatMeters(m.maxProjection)}</dd></div>
                  <div className="flex justify-between py-2.5"><dt className="text-muted">Precio orientativo</dt><dd>desde {formatMoney(fromPrice(m, catalog))}</dd></div>
                </dl>
                <Link href={`/configurador?modelo=${m.slug}`} className="mt-8 inline-block bg-ink px-6 py-3 text-paper transition-colors hover:bg-terracotta">
                  Configurar {m.name}
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      {/* Galería de ambiente, en rejilla asimétrica */}
      <section className="border-t border-line pt-16">
        <h2 className="text-4xl">En casa de clientes</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-12">
          <div className="photo-zoom relative aspect-[3/4] overflow-hidden md:col-span-4"><Image src="/img/ambiente-aix.webp" alt="Fachada con pérgola de madera" fill sizes="33vw" className="object-cover" /></div>
          <div className="photo-zoom relative aspect-[4/3] overflow-hidden md:col-span-8 md:mt-24"><Image src="/img/ambiente-pergola-moderna.webp" alt="Pérgola moderna sobre patio" fill sizes="66vw" className="object-cover" /></div>
          <div className="photo-zoom relative aspect-[3/2] overflow-hidden md:col-span-7 md:col-start-2"><Image src="/img/ambiente-deck.webp" alt="Terraza de madera junto al jardín" fill sizes="58vw" className="object-cover" /></div>
          <div className="photo-zoom relative aspect-square overflow-hidden md:col-span-4 md:-mt-20"><Image src="/img/ambiente-mesa.webp" alt="Mesa bajo pérgola" fill sizes="33vw" className="object-cover" /></div>
        </div>
      </section>
    </div>
  );
}
