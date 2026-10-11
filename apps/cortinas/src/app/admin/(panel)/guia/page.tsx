import Link from "next/link";

export const metadata = { title: "Guía del catálogo — Cota" };

const STEPS = [
  { n: 1, title: "Materiales", href: "/admin/catalogo/materiales", text: "Cree los materiales y marque qué atributos y valores admite cada uno." },
  { n: 2, title: "Atributos", href: "/admin/catalogo/atributos", text: "Cree las opciones y sus valores: genéricas o según material." },
  { n: 3, title: "Categorías", href: "/admin/catalogo/familias", text: "Elija qué atributos pide cada categoría y cuáles son obligatorios." },
  { n: 4, title: "Productos", href: "/admin/catalogo/productos", text: "Dé a cada producto su categoría y material: hereda lo que ambos permiten." },
  { n: 5, title: "Variantes", href: "/admin/catalogo/variantes", text: "Dé un código propio a las combinaciones que vende con SKU." },
  { n: 6, title: "Reglas", href: "/admin/catalogo/reglas", text: "Bloquee combinaciones, limite medidas y sume recargos." },
  { n: 7, title: "El cliente configura", href: "/catalogo", text: "Ve solo lo que permiten la categoría y el material, con las reglas." },
];

export default function Guide() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl">Guía del catálogo</h1>
      <p className="mt-1 text-sm text-muted">Siete pasos, en este orden.</p>
      <ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-xs" aria-label="Esquema" data-testid="guide-diagram">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2">
            <span className={`border px-2.5 py-1.5 ${s.n === 7 ? "border-blue text-blue" : "border-ink"}`}>{s.title}</span>
            {i < STEPS.length - 1 && <span aria-hidden className="text-muted">→</span>}
          </li>
        ))}
      </ol>
      <ol className="mt-10 divide-y divide-line border-y border-line">
        {STEPS.map((s) => (
          <li key={s.n} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-4">
            <span className="font-serif text-2xl">{s.n}</span>
            <p><span className="font-medium">{s.title}.</span> <span className="text-muted">{s.text}</span></p>
            <Link href={s.href} className="text-sm underline underline-offset-4 hover:text-blue">{s.n === 7 ? "Ver catálogo" : "Abrir"}</Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
