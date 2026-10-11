"use client";
import { useEffect, useState } from "react";

const STEPS = ["Elige", "Configura", "Envía"];

/** Barra compacta de 3 pasos: 1 Elige · 2 Configura · 3 Envía. */
export function StepBar({ current, notes }: { current: 1 | 2 | 3; notes?: [string, string, string] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs" aria-label="Pasos" data-testid="step-bar">
      {STEPS.map((s, i) => {
        const n = i + 1;
        return (
          <li key={s} className={`flex items-center gap-2 ${n === current ? "text-ink" : "text-muted"}`} aria-current={n === current ? "step" : undefined}>
            <span className={`grid size-5 place-items-center rounded-full border text-[10px] ${n === current ? "border-accent bg-accent text-white" : n < current ? "border-accent text-accent" : "border-line"}`}>{n < current ? "✓" : n}</span>
            <span>{s}{notes && <span className="text-muted"> · {notes[i]}</span>}</span>
            {n < 3 && <span aria-hidden className="text-line">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Barra de pasos del proyecto: se muestra una vez y se puede cerrar. */
export function ProjectIntro() {
  const [show, setShow] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShow(!localStorage.getItem("cota-intro-proyecto"))); return () => cancelAnimationFrame(id); }, []);
  if (!show) return null;
  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-6 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white-stone px-4 py-3" data-testid="project-intro">
        <StepBar current={2} notes={["añada ventanas", "medidas y opciones", "revise y envíe"]} />
        <button onClick={() => { localStorage.setItem("cota-intro-proyecto", "1"); setShow(false); }} className="text-xs text-muted underline underline-offset-4 hover:text-ink">Entendido</button>
      </div>
    </div>
  );
}
