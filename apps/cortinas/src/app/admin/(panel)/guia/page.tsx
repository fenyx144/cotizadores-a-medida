import Link from "next/link";

export const metadata = { title: "Guía del catálogo — Cota" };

const STEPS = [
  { n: 1, title: "Atributos", href: "/admin/catalogo/atributos", text: "Cree las opciones (tela, color, accionamiento) y sus valores con recargo." },
  { n: 2, title: "Categorías", href: "/admin/catalogo/familias", text: "Elija qué atributos pide cada categoría y cuáles son obligatorios." },
  { n: 3, title: "Productos", href: "/admin/catalogo/productos", text: "Asigne cada producto a una categoría: hereda sus atributos." },
  { n: 4, title: "Variantes", href: "/admin/catalogo/variantes", text: "Dé un código propio a las combinaciones que vende con SKU." },
  { n: 5, title: "Reglas", href: "/admin/catalogo/reglas", text: "Bloquee combinaciones, limite medidas y sume recargos." },
  { n: 6, title: "El cliente configura", href: "/catalogo", text: "La ficha y la tabla muestran los atributos en orden, con las reglas." },
];

export default function Guide() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl">Guía del catálogo</h1>
      <p className="mt-1 text-sm text-muted">Seis pasos, en este orden.</p>
      <ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-xs" aria-label="Esquema" data-testid="guide-diagram">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span className={`border px-2.5 py-1.5 ${s.n === 6 ? "border-blue text-blue" : "border-ink"}`}>{s.title}</span>
            {i < STEPS.length - 1 && <span aria-hidden className="text-muted">→</span>}
          </li>
        ))}
      </ol>
      <ol className="mt-10 divide-y divide-line border-y border-line">
        {STEPS.map((s) => (
          <li key={s.n} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-4">
            <span className="font-serif text-2xl">{s.n}</span>
            <p><span className="font-medium">{s.title}.</span> <span className="text-muted">{s.text}</span></p>
            <Link href={s.href} className="text-sm underline underline-offset-4 hover:text-blue">{s.n === 6 ? "Ver catálogo" : "Abrir"}</Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
