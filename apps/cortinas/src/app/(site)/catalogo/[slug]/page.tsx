import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { formatMeters, formatMoney } from "@portafolio/core/pricing";
import { fabricsFor, getCatalog } from "@/lib/catalog";
import { DRIVE_LABELS, MATERIAL_LABELS, TYPE_LABELS, USE_LABELS } from "@/lib/content";
import { getClientSession } from "@/lib/client-session";
import { getDb, schema } from "@/lib/db";
import { CurtainPreview } from "@/components/CurtainPreview";
import { AddToProject } from "@/components/AddToProject";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const model = catalog.models.find((m) => m.slug === slug);
  if (!model) notFound();
  const fabrics = fabricsFor(catalog, model);
  const session = await getClientSession();
  // Proyectos en borrador del cliente, para "agregar al proyecto".
  const drafts = session
    ? await getDb()
        .select({ id: schema.projects.id, name: schema.projects.name })
        .from(schema.projects)
        .where(and(eq(schema.projects.clientId, session.userId), eq(schema.projects.status, "borrador")))
        .orderBy(desc(schema.projects.updatedAt))
    : [];
  const motorRule = catalog.rules.find((r) => r.drive === "motor");
  const photos = [model.image, ...model.gallery];

  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-8 md:px-10">
      <nav className="font-mono text-xs text-muted">
        <Link href="/catalogo" className="hover:text-ink">Catálogo</Link> / {TYPE_LABELS[model.type]}
      </nav>
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
              <CurtainPreview width={150} height={150} hex={fabrics[0]?.hex ?? "#ccc"} type={model.type} className="h-full w-full p-2" />
            </div>
          </div>
        </div>

        {/* Ficha */}
        <div className="md:col-span-5">
          <p className="font-mono text-xs text-muted">{MATERIAL_LABELS[model.material]} · {model.uses.split(",").map((u) => USE_LABELS[u]).join(", ")}</p>
          <h1 className="mt-3 text-[2.8rem] leading-[1.02] md:text-[3.4rem]">{model.name}</h1>
          <p className="mt-4 text-lg text-muted">{model.description}</p>

          <dl className="mt-8 divide-y divide-line border-y border-line text-[0.95rem]">
            <div className="flex justify-between py-3"><dt className="text-muted">Ancho</dt><dd className="font-mono text-sm">{formatMeters(model.minWidth)} – {formatMeters(model.maxWidth)}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted">Alto</dt><dd className="font-mono text-sm">{formatMeters(model.minProjection)} – {formatMeters(model.maxProjection)}</dd></div>
            <div className="flex justify-between py-3"><dt className="text-muted">Precio base</dt><dd>{formatMoney(model.basePrice)} + {formatMoney(model.pricePerM2)}/m²</dd></div>
            <div className="py-3">
              <dt className="text-muted">Accionamiento</dt>
              <dd className="mt-2 space-y-1">
                {(["manual", "motor", "sensor"] as const).map((d) => {
                  const rule = catalog.rules.find((r) => r.drive === d);
                  return (
                    <p key={d} className="flex justify-between"><span>{DRIVE_LABELS[d]}</span><span className="text-muted">{rule ? `+ ${formatMoney(rule.amount)}` : "Incluido"}</span></p>
                  );
                })}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <p className="font-mono text-xs text-muted">Telas ({fabrics.length})</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {fabrics.map((f) => (
                <li key={f.id} className="flex items-center gap-3">
                  <span className="size-8 shrink-0 border border-line" style={{ background: f.hex }} />
                  <span>
                    {f.name}
                    <span className="block font-mono text-[11px] text-muted">{f.code}{f.surchargePerM2 ? ` · +${formatMoney(f.surchargePerM2)}/m²` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 border-t border-ink pt-6">
            <h2 className="text-[1.6rem]">Agregar al proyecto</h2>
            {session ? (
              <AddToProject
                model={{ id: model.id, name: model.name, minWidth: model.minWidth, maxWidth: model.maxWidth, minHeight: model.minProjection, maxHeight: model.maxProjection }}
                fabrics={fabrics.map((f) => ({ id: f.id, name: f.name }))}
                projects={drafts}
              />
            ) : (
              <p className="mt-3 text-muted">
                <Link href={`/cliente/ingresar?next=/catalogo/${model.slug}`} className="text-ink underline decoration-accent underline-offset-4">Ingrese</Link> o{" "}
                <Link href="/cliente/registro" className="text-ink underline decoration-accent underline-offset-4">cree una cuenta</Link> para armar un proyecto por ambientes. Para una casa, use la{" "}
                <Link href="/particulares" className="text-ink underline decoration-accent underline-offset-4">cotización rápida</Link>.
              </p>
            )}
            {motorRule && <p className="mt-4 text-xs text-muted">Motorización desde {formatMoney(motorRule.amount)} por cortina. Precios con IGV.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
