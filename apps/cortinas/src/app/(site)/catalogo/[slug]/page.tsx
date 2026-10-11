import { SHOW_SURCHARGES } from "@/lib/flags";
import { StepBar } from "@/components/StepBar";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { formatMeters, formatMoney } from "@portafolio/core/pricing";
import { getCatalog } from "@/lib/catalog";
import { MATERIAL_LABELS, TYPE_LABELS, USE_LABELS } from "@/lib/content";
import { getClientSession } from "@/lib/client-session";
import { getDb, schema } from "@/lib/db";
import { CurtainPreview } from "@/components/CurtainPreview";
import { AddToProject } from "@/components/AddToProject";
import { evaluate , MATERIAL_ATTR, productMaterials } from "@/lib/rules";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const model = catalog.models.find((m) => m.slug === slug);
  if (!model) notFound();
  const session = await getClientSession();
  // Proyectos en borrador del cliente, para "agregar al proyecto".
  const drafts = session
    ? await getDb()
        .select({ id: schema.projects.id, name: schema.projects.name })
        .from(schema.projects)
        .where(and(eq(schema.projects.clientId, session.userId), eq(schema.projects.status, "borrador")))
        .orderBy(desc(schema.projects.updatedAt))
    : [];
  const [me] = session ? await getDb().select({ kind: schema.clients.kind }).from(schema.clients).where(eq(schema.clients.id, session.userId)) : [];

  const family = catalog.families.find((f) => f.id === model.familyId);
  const photos = [model.image, ...model.gallery].filter(Boolean);
  // Opciones: los atributos que pide la categoría, con sus valores permitidos.
  const options = evaluate(catalog, { modelId: model.id }).fields.filter((f) => f.choices.length && f.kind !== "sino" && f.attribute.id !== MATERIAL_ATTR);
  const mats = productMaterials(catalog, model);
  const extras = evaluate(catalog, { modelId: model.id }).fields.filter((f) => f.kind === "sino" || f.kind === "numero");
  const firstHex = options.flatMap((f) => f.choices).find((c) => c.hex)?.hex ?? "#ccc";

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-8 md:px-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/catalogo" className="hover:text-ink">Catálogo</Link> / {family ? <Link href={`/catalogo?categoria=${family.id}`} className="hover:text-ink">{family.name}</Link> : TYPE_LABELS[model.type]}
      </nav>
      <div className="mt-4"><StepBar current={2} /></div>
      <div className="mt-6 grid gap-12 md:grid-cols-12">
        {/* Fotos */}
        <div className="md:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
            <Image src={photos[0]} alt={model.name} fill priority sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {photos.slice(1).map((src) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
              </div>
            ))}
            <div className="grid-paper flex aspect-[4/3] items-center justify-center border border-line bg-white-stone">
              <CurtainPreview width={150} height={150} hex={firstHex} type={model.type} className="h-full w-full p-2" />
            </div>
          </div>
        </div>

        {/* Ficha */}
        <div className="md:col-span-5">
          <p className="font-mono text-xs text-muted">{mats.length ? mats.map((x) => x.name).join(" · ") : MATERIAL_LABELS[model.material]} · {model.uses.split(",").map((u) => USE_LABELS[u]).join(", ")}</p>
          <h1 className="mt-3 text-[2.8rem] leading-[1.02] md:text-[3.4rem]">{model.name}</h1>
          <p className="mt-4 text-lg text-muted">{model.description}</p>

          <dl className="mt-8 divide-y divide-line border-y border-line text-[0.95rem]">
            <div className="flex justify-between py-3"><dt className="text-muted">Ancho</dt><dd className="font-mono text-sm">{formatMeters(model.minWidth)} – {formatMeters(model.maxWidth)}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted">Alto</dt><dd className="font-mono text-sm">{formatMeters(model.minProjection)} – {formatMeters(model.maxProjection)}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted">Precio base</dt><dd>{formatMoney(model.basePrice)} + {formatMoney(model.pricePerM2)}/m²</dd></div>
          </dl>

          {model.specs?.length > 0 && (
            <section className="mt-8" data-testid="specs">
              <h2 className="text-[1.6rem]">Ficha técnica</h2>
              <table className="mt-3 w-full border-y border-line text-[0.95rem]">
                <tbody className="divide-y divide-line">
                  {model.specs.map((r) => (
                    <tr key={r.label}><th scope="row" className="w-1/2 py-2.5 pr-4 text-left font-normal text-muted">{r.label}</th><td className="py-2.5">{r.value}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {options.map((f) => (
            <div key={f.attribute.id} className="mt-8" data-testid="option-group">
              <p className="font-mono text-xs text-muted">{f.attribute.name} ({f.choices.length})</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {f.choices.map((c) => {
                  const v = catalog.values.find((x) => x.id === c.value)!;
                  return (
                    <li key={c.value} className="flex items-center gap-3">
                      {c.image ? <img src={c.image} alt="" className="size-8 shrink-0 border border-line object-cover" /> : c.hex && <span className={`size-8 shrink-0 border border-line ${f.attribute.name.toLowerCase().includes("perfil") ? "rounded-full" : ""}`} style={{ background: c.hex }} />}
                      <span>
                        {v.name}
                        {(v.code || (SHOW_SURCHARGES && v.surcharge > 0)) && <span className="block font-mono text-[11px] text-muted">{v.code}{SHOW_SURCHARGES && v.surcharge > 0 ? `${v.code ? " · " : ""}+${formatMoney(v.surcharge)}${v.surchargeKind === "por_m2" ? "/m²" : ""}` : ""}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {extras.length > 0 && <p className="mt-6 text-sm text-muted">También: {extras.map((f) => f.attribute.name.toLowerCase()).join(", ")}.</p>}

          <div className="mt-10 border-t border-ink pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-[1.6rem]">Configurar y cotizar</h2><Link href={`/configurar?modelo=${model.slug}`} className="text-sm underline underline-offset-4" data-testid="wizard-cta">Paso a paso</Link></div>
            <AddToProject modelId={model.id} slug={model.slug} catalog={catalog} projects={drafts} loggedIn={!!session} particular={me?.kind === "particular"} />
            <p className="mt-4 text-xs text-muted">Precios con IGV.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
