import Image from "next/image";
import Link from "next/link";
import { CASE_STUDIES } from "@/lib/content";

export const metadata = { title: "Proyectos realizados — Cota" };

export default function ProjectsPage() {
  const total = CASE_STUDIES.reduce((s, c) => s + c.windows, 0);
  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10">
      <div className="grid gap-6 border-b border-line pb-8 md:grid-cols-12 md:items-end">
        <h1 className="text-[3rem] leading-none md:col-span-7 md:text-[4rem]">Proyectos realizados</h1>
        <p className="text-muted md:col-span-4 md:col-start-9">De un pabellón de seis aulas a una sede universitaria. {total} ventanas en los últimos cuatro casos.</p>
      </div>
      <div className="divide-y divide-line">
        {CASE_STUDIES.map((c, i) => (
          <article key={c.slug} id={c.slug} className="grid scroll-mt-24 gap-8 py-14 md:grid-cols-12">
            <div className={`relative aspect-[4/3] overflow-hidden bg-paper-deep md:col-span-6 ${i % 2 ? "md:order-2 md:col-start-7" : ""}`}>
              <Image src={c.image} alt={c.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className={`md:col-span-5 ${i % 2 ? "md:order-1" : "md:col-start-8"}`}>
              <p className="font-mono text-xs text-muted">{c.sector} · {c.size} · {c.place}</p>
              <h2 className="mt-3 text-[2.2rem] leading-[1.05]">{c.name}</h2>
              <p className="mt-4 text-muted">{c.text}</p>
              <dl className="mt-8 grid grid-cols-3 border-t border-ink pt-4">
                <div><dt className="font-mono text-[11px] text-muted">Ventanas</dt><dd className="font-serif text-[2.6rem] leading-none">{c.windows}</dd></div>
                <div className="border-l border-line pl-4"><dt className="font-mono text-[11px] text-muted">Semanas</dt><dd className="font-serif text-[2.6rem] leading-none">{c.weeks}</dd></div>
                <div className="border-l border-line pl-4"><dt className="font-mono text-[11px] text-muted">Ambientes</dt><dd className="mt-1 text-sm leading-snug">{c.rooms}</dd></div>
              </dl>
              <p className="mt-5 text-sm"><span className="text-muted">Solución: </span>{c.product}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 border-t border-ink pt-8">
        <p className="font-serif text-[1.8rem]">¿Tiene un proyecto parecido?</p>
        <Link href="/cliente/registro" className="bg-blue px-5 py-3 text-white-stone hover:bg-ink">Subir mi plano</Link>
      </div>
    </div>
  );
}
