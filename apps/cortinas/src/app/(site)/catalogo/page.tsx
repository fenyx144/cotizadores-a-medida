import { SHOW_PRICES } from "@/lib/flags";
import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@portafolio/core/pricing";
import { getCatalog } from "@/lib/catalog";
import { TYPE_LABELS, USE_LABELS } from "@/lib/content";
import { StepBar } from "@/components/StepBar";
import { productMaterials } from "@/lib/rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo — Cota" };

type Params = { tipo?: string; material?: string; uso?: string; categoria?: string };

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
  const catalog = await getCatalog();
  const { models, families, materials } = catalog;
  const offers = (m: (typeof models)[number], slug?: string) => !slug || productMaterials(catalog, m).some((x) => x.slug === slug);
  const materialOptions = Object.fromEntries(materials.filter((x) => x.active).map((x) => [x.slug, x.name]));
  const family = families.find((f) => String(f.id) === params.categoria);

  // Inicio del catálogo: tarjetas de categoría con foto.
  if (!family && !params.tipo && !params.material && !params.uso) {
    const cards = families.map((f) => ({ f, items: models.filter((m) => m.familyId === f.id) })).filter((c) => c.items.length);
    return (
      <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10">
        <div className="grid gap-6 border-b border-line pb-8 md:grid-cols-12 md:items-end">
          <h1 className="text-[3rem] leading-none md:col-span-6 md:text-[4rem]">Catálogo</h1>
          <div className="flex flex-wrap items-center justify-between gap-4 md:col-span-5 md:col-start-8"><StepBar current={1} /><Link href="/configurar" className="bg-ink px-4 py-2 text-sm text-paper" data-testid="wizard-cta">Configurar paso a paso</Link></div>
        </div>
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" data-testid="category-cards">
          {cards.map(({ f, items }) => (
            <Link key={f.id} href={`/catalogo?categoria=${f.id}`} className="photo-zoom group block border-t border-line pt-4" data-testid="category-card">
              <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                {items[0].image && <Image src={items[0].image} alt={f.name} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h2 className="text-[1.8rem] leading-tight group-hover:text-blue">{f.name}</h2>
                <span className="shrink-0 font-mono text-xs text-muted">{items.length} {items.length === 1 ? "producto" : "productos"}</span>
              </div>
              {f.description && <p className="mt-1 text-muted">{f.description}</p>}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Página de categoría: sus productos con filtro de material.
  if (family) {
    const inFamily = models.filter((m) => m.familyId === family.id);
    const allowedMats = family.materials.split(",").filter(Boolean);
    const mats = Object.fromEntries(materials.filter((x) => x.active && (allowedMats.length ? allowedMats.includes(x.slug) : inFamily.some((m) => offers(m, x.slug)))).map((x) => [x.slug, x.name]));
    const items = inFamily.filter((m) => offers(m, params.material));
    return (
      <div className="mx-auto max-w-[1360px] px-5 pt-8 md:px-10">
        <nav className="font-mono text-xs text-muted"><Link href="/catalogo" className="hover:text-ink">Catálogo</Link> / {family.name}</nav>
        <div className="mt-4 grid gap-6 border-b border-line pb-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <h1 className="text-[2.8rem] leading-none md:text-[3.6rem]">{family.name}</h1>
            {family.description && <p className="mt-3 text-muted">{family.description}</p>}
          </div>
          <div className="space-y-3 md:col-span-4 md:col-start-9"><StepBar current={1} /><Link href={`/configurar?categoria=${family.id}`} className="inline-block text-sm underline underline-offset-4">Configurar paso a paso</Link></div>
        </div>
        {Object.keys(mats).length > 1 && (
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" data-testid="material-filter">
            <span className="font-mono text-xs text-muted">Material</span>
            {[["", "Todos"], ...Object.entries(mats)].map(([v, l]) => (
              <Link key={v} href={`/catalogo?categoria=${family.id}${v ? `&material=${v}` : ""}`} className={(params.material ?? "") === v ? "text-ink underline decoration-accent underline-offset-4" : "text-muted hover:text-ink"}>{l}</Link>
            ))}
          </div>
        )}
        <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <Link key={m.id} href={`/catalogo/${m.slug}`} className="photo-zoom group block border-t border-line pt-4" data-testid="product-card">
              <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep">
                <Image src={m.image} alt={m.name} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h3 className="text-[1.6rem] leading-tight group-hover:text-blue">{m.name}</h3>
                <span className="shrink-0 font-mono text-xs text-muted">{productMaterials(catalog, m).map((x) => x.name).join(" · ")}</span>
              </div>
              <p className="mt-1 text-muted">{m.tagline}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const list = models.filter(
    (m) => (!params.tipo || m.type === params.tipo) && offers(m, params.material) && (!params.uso || m.uses.split(",").includes(params.uso)),
  );

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10">
      <div className="grid gap-6 border-b border-line pb-8 md:grid-cols-12 md:items-end">
        <h1 className="text-[3rem] leading-none md:col-span-6 md:text-[4rem]">Catálogo</h1>
        <p className="text-muted md:col-span-5 md:col-start-8">{SHOW_PRICES ? "Precios de referencia por una ventana de 1,50 × 1,50 m, con instalación e IGV. El precio final depende de medidas y cantidad." : "Productos a medida. Configure las opciones y solicite su cotización."}</p>
      </div>
      <div className="mt-8 grid gap-10 md:grid-cols-12">
        <aside className="md:col-span-3 lg:col-span-2">
          <FilterGroup title="Tipo" param="tipo" options={TYPE_LABELS} current={params.tipo} params={params} />
          <FilterGroup title="Material" param="material" options={materialOptions} current={params.material} params={params} />
          <FilterGroup title="Uso" param="uso" options={USE_LABELS} current={params.uso} params={params} />
        </aside>
        <div className="md:col-span-9 lg:col-span-10">
          <p className="font-mono text-xs text-muted">{list.length} {list.length === 1 ? "producto" : "productos"}</p>
          {list.length === 0 && <p className="mt-8 text-muted">No hay productos con esa combinación. <Link href="/catalogo" className="underline">Quitar filtros</Link></p>}
          {[...families.map((f) => ({ id: f.id as number | null, name: f.name, description: f.description })), { id: null, name: "Otros productos", description: "" }]
            .map((g) => ({ ...g, items: list.filter((m) => (m.familyId ?? null) === g.id || (g.id === null && m.familyId != null && !families.some((f) => f.id === m.familyId))) }))
            .filter((g) => g.items.length)
            .map((g) => (
              <section key={g.id ?? "otros"} className="mt-10 first:mt-4" data-testid="family-group">
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2">
                  <h2 className="text-[2rem] leading-tight">{g.name}</h2>
                  {g.description && <p className="max-w-xl text-sm text-muted">{g.description}</p>}
                </div>
                <div className="mt-6 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((m) => (
              <Link key={m.id} href={`/catalogo/${m.slug}`} className="photo-zoom group block border-t border-line pt-4">
                <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep">
                  <Image src={m.image} alt={m.name} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="text-[1.6rem] leading-tight group-hover:text-blue">{m.name}</h3>
                  <span className="shrink-0 font-mono text-xs text-muted">{TYPE_LABELS[m.type]}</span>
                </div>
                <p className="mt-1 text-muted">{m.tagline}</p>
                <p className="mt-3 text-sm">
                  {SHOW_PRICES && <>Desde <span className="font-medium">{formatMoney(m.basePrice + 2.25 * m.pricePerM2 + 25)}</span> · </>}
                  <span className="text-muted">{m.uses.split(",").map((u) => USE_LABELS[u]).join(", ")}</span>
                </p>
              </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>
    </div>
  );
}
