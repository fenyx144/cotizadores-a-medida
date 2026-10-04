"use client";
/** Asistente de tres preguntas que recomienda modelos (lógica en lib/recommend.ts). */
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { recommend, type Answers } from "@/lib/recommend";
import { TYPE_IMAGES, TYPE_LABELS } from "@/lib/content";

type Model = { slug: string; name: string; type: string; image: string };

const QUESTIONS: { key: keyof Answers; title: string; options: { value: string; label: string; note: string }[] }[] = [
  {
    key: "place",
    title: "¿Dónde necesitas sombra?",
    options: [
      { value: "terraza", label: "En la terraza, pegada a la casa", note: "Patio, porche o terraza a pie de calle" },
      { value: "balcon", label: "En un balcón o ático", note: "Espacio más pequeño, a veces con viento" },
      { value: "jardin", label: "En medio del jardín", note: "Lejos de la fachada" },
      { value: "ventanas", label: "Delante de ventanas", note: "Para que no entre el sol de la tarde" },
    ],
  },
  {
    key: "shade",
    title: "¿Cuánta sombra buscas?",
    options: [
      { value: "algo", label: "Un poco, a ratos", note: "Lo abro cuando aprieta el sol" },
      { value: "mucha", label: "Bastante, casi todos los días", note: "Comidas, siestas, teletrabajo fuera" },
      { value: "total", label: "Toda la temporada", note: "Quiero un espacio cubierto fijo" },
    ],
  },
  {
    key: "budget",
    title: "¿Qué presupuesto tienes en mente?",
    options: [
      { value: "ajustado", label: "Hasta S/ 800", note: "" },
      { value: "medio", label: "Entre S/ 800 y 1,500", note: "" },
      { value: "amplio", label: "Más de S/ 1,500", note: "" },
    ],
  },
];

export function Wizard({ models }: { models: Model[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const done = step >= QUESTIONS.length;

  function choose(key: keyof Answers, value: string) {
    setAnswers({ ...answers, [key]: value });
    setStep(step + 1);
  }

  if (done) {
    const results = recommend(answers as Answers).slice(0, 2);
    return (
      <div className="animate-rise">
        <p className="text-sm text-muted">Te recomendamos</p>
        <div className="mt-6 grid gap-10 md:grid-cols-2">
          {results.map((r, i) => {
            const m = models.find((x) => x.type === r.type);
            if (!m) return null;
            return (
              <div key={r.type} className={i === 1 ? "md:mt-20" : ""}>
                <div className="photo-zoom relative aspect-[4/3] overflow-hidden">
                  <Image src={m.image || TYPE_IMAGES[m.type]} alt={m.name} fill sizes="50vw" className="object-cover" />
                </div>
                <div className="mt-4 flex items-baseline justify-between border-b border-line pb-3">
                  <h2 className="text-3xl">{m.name}</h2>
                  <span className="text-sm text-muted">{i === 0 ? "Nuestra primera opción" : "También encaja"} · {TYPE_LABELS[m.type]}</span>
                </div>
                <p className="mt-3 text-muted">{r.reason}</p>
                <Link href={`/configurador?modelo=${m.slug}`} className="mt-5 inline-block bg-ink px-6 py-3 text-paper transition-colors hover:bg-terracotta">Configurar {m.name}</Link>
              </div>
            );
          })}
        </div>
        <button onClick={() => { setStep(0); setAnswers({}); }} className="link-grow mt-12 text-sm text-muted">Volver a empezar</button>
      </div>
    );
  }

  const q = QUESTIONS[step];
  return (
    <div key={step} className="animate-rise grid gap-10 md:grid-cols-12">
      <div className="md:col-span-5">
        <p className="text-sm text-muted">Pregunta {step + 1} de {QUESTIONS.length}</p>
        <h2 className="mt-3 text-4xl md:text-5xl">{q.title}</h2>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="link-grow mt-6 text-sm text-muted">Atrás</button>}
      </div>
      <ul className="border-t border-line md:col-span-6 md:col-start-7">
        {q.options.map((o) => (
          <li key={o.value} className="border-b border-line">
            <button onClick={() => choose(q.key, o.value)} className={`group flex w-full items-baseline justify-between gap-4 py-5 text-left ${answers[q.key] === o.value ? "text-terracotta" : ""}`}>
              <span>
                <span className="block font-serif text-2xl transition-transform group-hover:translate-x-1">{o.label}</span>
                {o.note && <span className="text-sm text-muted">{o.note}</span>}
              </span>
              <span className="text-muted transition-transform group-hover:translate-x-1" aria-hidden>→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
