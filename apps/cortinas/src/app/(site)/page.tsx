import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { CASE_STUDIES, SECTORS } from "@/lib/content";

// Ventanas marcadas sobre el recorte del plano de portada (posición en %).
const DEMO_MARKS = Array.from({ length: 12 }, (_, i) => ({
  label: `V${i + 1}`,
  left: 5.75 + i * 7.5,
  state: i === 4 ? "observada" : i > 8 ? "pendiente" : "configurada",
}));

export default function HomePage() {
  return (
    <>
      {/* Portada: foto grande con el texto en una columna sobre papel */}
      <section className="mx-auto max-w-[1360px] px-5 pt-8 md:px-10 md:pt-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="font-mono text-xs text-muted">Arequipa · Lima · todo el sur del Perú</p>
            <h1 className="mt-5 text-[2.9rem] leading-[1.02] md:text-[4.6rem]">
              Cortinas para aulas y oficinas, cotizadas sobre su plano.
            </h1>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <p className="text-lg leading-relaxed text-muted">
              Suba el plano, marque cada ventana y configure. Le devolvemos una cotización por ambiente, lista para su área de logística.
            </p>
            <div className="mt-7 flex flex-wrap gap-5 text-[0.95rem]">
              <Link href="/cliente/registro" className="bg-blue px-5 py-3 text-white-stone transition-colors hover:bg-ink">Empezar un proyecto</Link>
              <Link href="/catalogo" className="link-grow self-center pb-0.5">Ver el catálogo</Link>
            </div>
          </div>
        </div>
        <figure className="mt-12">
          <div className="relative aspect-[16/8] overflow-hidden bg-paper-deep md:aspect-[16/7]">
            <Image src="/img/hero-aula-magna.webp" alt="Aula magna con ventanales altos" fill priority sizes="100vw" className="object-cover" />
          </div>
          <figcaption className="mt-3 flex justify-between font-mono text-xs text-muted">
            <span>Fig. 01 — Aula magna, ventanales de 2,40 × 3,20 m</span>
            <span>Roller screen 5%, motor por fachada</span>
          </figcaption>
        </figure>
      </section>

      {/* Línea de valor en tres pasos */}
      <section className="mx-auto mt-24 max-w-[1360px] px-5 md:px-10">
        <div className="grid border-t border-ink md:grid-cols-3">
          {[
            ["01", "Suba el plano", "PDF o imagen. También puede listar ambientes o pedir que midamos en obra."],
            ["02", "Marque y configure", "Cada ventana con su código, producto, tela, medidas y cantidad."],
            ["03", "Reciba la cotización", "Totales por ambiente y por producto, en PDF y Excel, con IGV."],
          ].map(([n, title, text], i) => (
            <Reveal key={n} delay={i * 90} className={`py-8 md:px-8 ${i ? "border-t border-line md:border-l md:border-t-0" : "md:pl-0"}`}>
              <p className="font-mono text-xs text-muted">{n}</p>
              <h2 className="mt-3 text-[1.9rem] leading-tight">{title}</h2>
              <p className="mt-2 max-w-sm text-muted">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Sectores */}
      <section className="mx-auto mt-24 max-w-[1360px] px-5 md:px-10">
        <div className="flex items-end justify-between border-b border-line pb-5">
          <h2 className="text-[2.4rem] leading-none md:text-[3rem]">Para quién trabajamos</h2>
          <Link href="/catalogo" className="link-grow hidden pb-0.5 text-sm md:block">Productos por uso</Link>
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {SECTORS.map((s, i) => (
            <Reveal key={s.key} delay={i * 90}>
              <Link href={`/catalogo?uso=${s.key}`} className="photo-zoom group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
                  <Image src={s.image} alt={s.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                </div>
                <h3 className="mt-5 text-[1.7rem] group-hover:text-blue">{s.title}</h3>
                <p className="mt-2 max-w-sm text-muted">{s.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Diferencial: el plano interactivo */}
      <section className="mt-28 border-y border-line bg-white-stone">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-16 md:grid-cols-12 md:px-10 md:py-20">
          <div className="md:col-span-4">
            <p className="font-mono text-xs text-muted">Mi proyecto</p>
            <h2 className="mt-4 text-[2.4rem] leading-[1.05] md:text-[3rem]">Cada ventana, con nombre y medida.</h2>
            <p className="mt-5 text-muted">
              Marque las ventanas sobre el plano con un punto o un rectángulo. Calibre la escala con una cota conocida y el sistema sugiere el ancho.
            </p>
            <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
              {[
                ["Ubicaciones", "Edificio, piso y ambiente"],
                ["Importar", "CSV o Excel con medidas"],
                ["Duplicar", "Un aula tipo, veinte iguales"],
                ["Exportar", "PDF con plano y Excel"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-8">
            <div className="relative overflow-hidden border border-line">
              <Image src="/img/plano-detalle.webp" alt="Detalle de un plano con ventanas marcadas" width={1400} height={805} className="w-full" />
              {DEMO_MARKS.map((m) => (
                <span
                  key={m.label}
                  style={{ left: `${m.left}%`, top: "19.6%" }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-1 font-mono text-[10px] leading-4 text-white ${
                    m.state === "configurada" ? "bg-blue" : m.state === "observada" ? "bg-danger" : "bg-muted"
                  }`}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted">
              <span><i className="mr-1.5 inline-block size-2 bg-blue align-middle" />Configurada</span>
              <span><i className="mr-1.5 inline-block size-2 bg-danger align-middle" />Observada</span>
              <span><i className="mr-1.5 inline-block size-2 bg-muted align-middle" />Sin configurar</span>
            </p>
          </div>
        </div>
      </section>

      {/* Proyectos destacados */}
      <section className="mx-auto mt-24 max-w-[1360px] px-5 md:px-10">
        <div className="flex items-end justify-between border-b border-line pb-5">
          <h2 className="text-[2.4rem] leading-none md:text-[3rem]">Proyectos recientes</h2>
          <Link href="/proyectos" className="link-grow pb-0.5 text-sm">Todos los proyectos</Link>
        </div>
        <div className="divide-y divide-line">
          {CASE_STUDIES.slice(0, 3).map((c) => (
            <Reveal key={c.slug}>
              <Link href={`/proyectos#${c.slug}`} className="photo-zoom group grid items-center gap-6 py-8 md:grid-cols-12">
                <div className="relative aspect-[3/2] overflow-hidden bg-paper-deep md:col-span-3">
                  <Image src={c.image} alt={c.name} fill sizes="(min-width: 768px) 25vw, 100vw" className="object-cover" />
                </div>
                <div className="md:col-span-5">
                  <p className="font-mono text-xs text-muted">{c.place}</p>
                  <h3 className="mt-2 text-[1.8rem] leading-tight group-hover:text-blue">{c.name}</h3>
                  <p className="mt-1 text-muted">{c.product}</p>
                </div>
                <dl className="grid grid-cols-2 gap-4 md:col-span-4">
                  <div>
                    <dt className="font-mono text-xs text-muted">Ventanas</dt>
                    <dd className="font-serif text-[2.6rem] leading-none">{c.windows}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs text-muted">Semanas</dt>
                    <dd className="font-serif text-[2.6rem] leading-none">{c.weeks}</dd>
                  </div>
                </dl>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Particulares */}
      <section className="mx-auto mt-24 max-w-[1360px] px-5 md:px-10">
        <div className="grid gap-6 border-t border-ink pt-8 md:grid-cols-12">
          <h2 className="text-[2rem] leading-tight md:col-span-5">¿Es para su casa?</h2>
          <p className="text-muted md:col-span-4">Sin cuenta: indique sus ventanas o pida que vayamos a medir. Respondemos en un día hábil.</p>
          <div className="md:col-span-3 md:text-right">
            <Link href="/particulares" className="link-grow pb-0.5">Cotización rápida</Link>
          </div>
        </div>
      </section>
    </>
  );
}
