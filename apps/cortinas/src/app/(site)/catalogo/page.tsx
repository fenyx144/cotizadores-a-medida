import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@portafolio/core/pricing";
import { getCatalog } from "@/lib/catalog";
import { MATERIAL_LABELS, TYPE_LABELS, USE_LABELS } from "@/lib/content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo — Cota" };

type Params = { tipo?: string; material?: string; uso?: string };

/** Filtros como enlaces: cada clic cambia un parámetro de la URL (se puede compartir). */
function FilterGroup({ title, param, options, current, params }: { title: string; param: keyof Params; options: Record<string, string>; current?: string; params: Params }) {
  const href = (value?: string) => {
    const next = new URLSearchParams(Object.entries({ ...params, [param]: value }).filter(([, v]) => v) as [string, string][]);
    const qs = next.toString();
    return qs ? `/catalogo?${qs}` : "/catalogo";
  };
  return (
    <div className="border-t border-line py-4">
      <p className="font-mono text-xs text-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-[0.95rem]">
        <li>
          <Link href={href(undefined)} className={!current ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>Todos</Link>
        </li>
        {Object.entries(options).map(([value, label]) => (
          <li key={value}>
            <Link href={href(value)} className={current === value ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { models } = await getCatalog();
  const list = models.filter(
    (m) => (!params.tipo || m.type === params.tipo) && (!params.material || m.material === params.material) && (!params.uso || m.uses.split(",").includes(params.uso)),
  );

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10">
      <div className="grid gap-6 border-b border-line pb-8 md:grid-cols-12 md:items-end">
        <h1 className="text-[3rem] leading-none md:col-span-6 md:text-[4rem]">Catálogo</h1>
        <p className="text-muted md:col-span-5 md:col-start-8">Precios de referencia por una ventana de 1,50 × 1,50 m, con instalación e IGV. El precio final depende de medidas y cantidad.</p>
      </div>
      <div className="mt-8 grid gap-10 md:grid-cols-12">
        <aside className="md:col-span-3 lg:col-span-2">
          <FilterGroup title="Tipo" param="tipo" options={TYPE_LABELS} current={params.tipo} params={params} />
          <FilterGroup title="Material" param="material" options={MATERIAL_LABELS} current={params.material} params={params} />
          <FilterGroup title="Uso" param="uso" options={USE_LABELS} current={params.uso} params={params} />
        </aside>
        <div className="md:col-span-9 lg:col-span-10">
          <p className="font-mono text-xs text-muted">{list.length} {list.length === 1 ? "producto" : "productos"}</p>
          {list.length === 0 && <p className="mt-8 text-muted">No hay productos con esa combinación. <Link href="/catalogo" className="underline">Quitar filtros</Link></p>}
          <div className="mt-4 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <Link key={m.id} href={`/catalogo/${m.slug}`} className="photo-zoom group block border-t border-line pt-4">
                <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep">
                  <Image src={m.image} alt={m.name} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-[1.6rem] leading-tight group-hover:text-blue">{m.name}</h2>
                  <span className="shrink-0 font-mono text-xs text-muted">{TYPE_LABELS[m.type]}</span>
                </div>
                <p className="mt-1 text-muted">{m.tagline}</p>
                <p className="mt-3 text-sm">
                  Desde <span className="font-medium">{formatMoney(m.basePrice + 2.25 * m.pricePerM2 + 25)}</span>
                  <span className="text-muted"> · {m.uses.split(",").map((u) => USE_LABELS[u]).join(", ")}</span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
