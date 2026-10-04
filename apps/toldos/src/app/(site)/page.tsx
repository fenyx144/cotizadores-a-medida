/**
 * Inicio. Estructura editorial: hero asimétrico, cifras, modelos en
 * rejilla tipo revista, adelanto del configurador, testimonios y proceso.
 */
import Image from "next/image";
import Link from "next/link";
import { formatEuro } from "@portafolio/core/pricing";
import { getCatalog } from "@/lib/catalog";
import { fromPrice } from "@/lib/price";
import { FIGURES, TESTIMONIALS, TYPE_IMAGES, TYPE_LABELS } from "@/lib/content";
import { AwningPreview } from "@/components/AwningPreview";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getCatalog();
  const stripes = catalog.fabrics.find((f) => f.pattern === "rayas") ?? catalog.fabrics[0];

  // Posiciones de la rejilla asimétrica (una por modelo).
  const layout = [
    "md:col-span-7",
    "md:col-span-4 md:col-start-9 md:mt-40",
    "md:col-span-5 md:col-start-2 md:-mt-10",
    "md:col-span-6 md:col-start-7 md:mt-24",
  ];
  const aspect = ["aspect-[4/3]", "aspect-[3/4]", "aspect-[4/5]", "aspect-[3/2]"];

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-20 pt-10 md:grid-cols-12 md:px-10 md:pt-10">
        <div className="flex flex-col justify-end md:col-span-5 md:pb-10">
          <p className="animate-rise text-sm text-muted">Toldos y pérgolas a medida · Noord-Holland y Utrecht</p>
          <h1 className="animate-rise mt-6 text-[2.9rem] leading-[1.02] [animation-delay:80ms] md:text-[4.6rem]">
            La sombra que tu terraza estaba esperando.
          </h1>
          <p className="animate-rise mt-6 max-w-md text-lg text-muted [animation-delay:160ms]">
            Medimos, fabricamos y montamos. Tú eliges la lona y el color; nosotros, que aguante muchos veranos.
          </p>
          <div className="animate-rise mt-10 flex flex-wrap items-center gap-6 [animation-delay:240ms]">
            <Link href="/configurador" className="bg-ink px-7 py-4 text-paper transition-colors hover:bg-terracotta">
              Diseña tu toldo
            </Link>
            <Link href="/solicitar-visita" className="link-grow text-ink">
              o pide una visita sin compromiso
            </Link>
          </div>
        </div>
        <figure className="md:col-span-7">
          <div className="photo-zoom relative aspect-[4/5] overflow-hidden md:aspect-auto md:h-[calc(100svh-150px)] md:min-h-[520px]">
            <Image src="/img/hero-terraza.webp" alt="Terraza con toldo verde oliva y plantas" fill priority sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
          </div>
          <figcaption className="mt-3 flex justify-between text-sm text-muted">
            <span>Retráctil Brisa, lona Oliva</span>
            <span>Haarlem</span>
          </figcaption>
        </figure>
      </section>

      {/* ---------- Cifras ---------- */}
      <section className="mx-auto max-w-[1320px] px-5 md:px-10">
        <div className="grid border-y border-line md:grid-cols-3">
          {FIGURES.map((f, i) => (
            <div key={f.label} className={`flex items-baseline gap-4 py-7 ${i > 0 ? "border-t border-line md:border-l md:border-t-0 md:pl-10" : ""}`}>
              <span className="font-serif text-4xl">{f.value}</span>
              <span className="text-muted">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Modelos ---------- */}
      <section className="mx-auto max-w-[1320px] px-5 pt-28 md:px-10">
        <div className="grid gap-6 md:grid-cols-12">
          <h2 className="text-4xl md:col-span-6 md:text-5xl">Cuatro maneras de dar sombra</h2>
          <p className="self-end text-muted md:col-span-4 md:col-start-9">
            Del toldo de brazos de toda la vida a una pérgola que convierte el jardín en otra habitación.
          </p>
        </div>
        <div className="mt-16 grid gap-x-8 gap-y-16 md:grid-cols-12">
          {catalog.models.map((m, i) => (
            <Reveal key={m.id} className={layout[i % 4]}>
              <Link href={`/modelos#${m.slug}`} className="group block">
                <div className={`photo-zoom relative overflow-hidden ${aspect[i % 4]}`}>
                  <Image src={m.image || TYPE_IMAGES[m.type]} alt={m.name} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="mt-4 flex items-baseline justify-between border-b border-line pb-3">
                  <h3 className="text-2xl">
                    {m.name} <span className="text-base text-muted">· {TYPE_LABELS[m.type]}</span>
                  </h3>
                  <span className="text-sm text-muted">desde {formatEuro(fromPrice(m, catalog))}</span>
                </div>
                <p className="mt-3 max-w-md text-muted transition-colors group-hover:text-ink">{m.tagline}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Configurador y prueba en casa ---------- */}
      <section className="mx-auto mt-32 max-w-[1320px] px-5 md:px-10">
        <div className="grid items-center gap-12 border-t border-line pt-16 md:grid-cols-12">
          <Reveal className="md:col-span-7">
            <AwningPreview type="cofre" width={450} projection={300} fabric={stripes} frameHex="#383E42" drive="sensor" className="w-full" />
          </Reveal>
          <div className="md:col-span-4 md:col-start-9">
            <h2 className="text-4xl">Míralo antes de pedirlo</h2>
            <p className="mt-5 text-muted">
              Elige modelo, medidas, lona y motor. El dibujo cambia contigo y el precio orientativo también.
            </p>
            <Link href="/configurador" className="mt-8 inline-block border border-ink px-6 py-3 transition-colors hover:bg-ink hover:text-paper">
              Abrir el configurador
            </Link>
          </div>
        </div>

        <div className="mt-24 grid items-end gap-12 md:grid-cols-12">
          <div className="order-2 md:order-1 md:col-span-4 md:col-start-2">
            <h2 className="text-4xl">Pruébalo en tu casa</h2>
            <p className="mt-5 text-muted">Sube una foto de tu fachada, coloca el toldo encima y descarga la imagen para enseñarla en casa.</p>
            <Link href="/pruebalo" className="link-grow mt-8 inline-block">
              Probar con mi foto
            </Link>
          </div>
          <Reveal className="order-1 md:order-2 md:col-span-6 md:col-start-7">
            <div className="photo-zoom relative aspect-[4/3] overflow-hidden">
              <Image src="/img/pruebalo-ejemplo.webp" alt="Fachada con un toldo a rayas superpuesto" fill sizes="50vw" className="object-cover object-[50%_40%]" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Testimonios ---------- */}
      <section className="mx-auto mt-32 max-w-[1320px] px-5 md:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="text-4xl">Lo que cuentan</h2>
            <div className="photo-zoom relative mt-8 hidden aspect-[3/4] overflow-hidden md:block">
              <Image src="/img/cafe-toldo.webp" alt="Terraza de café con toldo" fill sizes="30vw" className="object-cover" />
            </div>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <blockquote className="border-t border-line py-10">
                  <p className="font-serif text-2xl leading-snug md:text-[1.9rem]">“{t.quote}”</p>
                  <footer className="mt-5 flex flex-wrap justify-between gap-2 text-sm text-muted">
                    <span>
                      <span className="text-ink">{t.name}</span> · {t.place}
                    </span>
                    <span>{t.detail}</span>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Proceso ---------- */}
      <section className="mx-auto mt-28 max-w-[1320px] px-5 md:px-10">
        <h2 className="text-4xl">Cómo trabajamos</h2>
        <ol className="mt-12 grid border-t border-line md:grid-cols-3">
          {[
            ["Diseñas", "En el configurador o con nosotros por teléfono. Sin compromiso."],
            ["Medimos en casa", "Una visita de media hora: medidas, anclajes y muestras de lona en mano."],
            ["Montamos", "En unas tres semanas. Un día de trabajo y todo queda limpio."],
          ].map(([title, text], i) => (
            <li key={title} className={`py-8 md:pr-10 ${i > 0 ? "border-t border-line md:border-l md:border-t-0 md:pl-10" : ""}`}>
              <span className="font-serif text-5xl text-terracotta">{i + 1}</span>
              <h3 className="mt-4 text-2xl">{title}</h3>
              <p className="mt-2 text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Llamada final ---------- */}
      <section className="mx-auto mt-28 max-w-[1320px] px-5 md:px-10">
        <div className="grid items-end gap-8 border-t border-ink pt-12 md:grid-cols-12">
          <p className="font-serif text-4xl leading-tight md:col-span-8 md:text-6xl">¿Hablamos de tu terraza este verano?</p>
          <div className="md:col-span-3 md:col-start-10">
            <Link href="/solicitar-visita" className="block bg-ink px-7 py-4 text-center text-paper transition-colors hover:bg-terracotta">
              Pedir visita
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
