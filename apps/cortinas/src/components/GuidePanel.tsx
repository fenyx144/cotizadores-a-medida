"use client";
/** "Ayúdame a elegir": preguntas filtradas por los productos de la categoría. */
import { useMemo, useState } from "react";
import type { CatalogData } from "@/lib/line-price";
import { answersFor, guideItems, guideResults, nextQuestion, type Answers } from "@/lib/guide";
import type { ProductVariant } from "@portafolio/core/db/schema";

const btn = "w-full border border-line bg-white px-4 py-3 text-left transition hover:border-ink";

export function GuidePanel({ catalog, familyId, onPick, onCancel }: {
  catalog: CatalogData; familyId: number;
  onPick: (modelId: number, values: Answers, variant?: ProductVariant) => void; onCancel: () => void;
}) {
  const items = useMemo(() => guideItems(catalog, familyId), [catalog, familyId]);
  const [answers, setAnswers] = useState<Answers>({});
  const [skipped, setSkipped] = useState<number[]>([]);
  const q = nextQuestion(catalog, items, answers, skipped);
  const results = guideResults(items, answers);
  const name = (id: number) => catalog.values.find((v) => v.id === id)?.name;
  const attrName = (id: number) => catalog.attributes.find((a) => a.id === id)?.name;

  return (
    <div className="space-y-3" data-testid="guide">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
        <span data-testid="guide-count">{results.length} {results.length === 1 ? "producto" : "productos"}</span>
        {Object.entries(answers).map(([a, v]) => (
          <button key={a} className="border border-line px-2 py-0.5 hover:border-ink" onClick={() => { const n = { ...answers }; delete n[Number(a)]; setAnswers(n); }}>
            {attrName(Number(a))}: {name(v)} ✕
          </button>
        ))}
        <button className="ml-auto underline underline-offset-4 hover:text-ink" onClick={onCancel}>Ver todos</button>
      </div>

      {q ? (
        <>
          <p className="pt-2 text-lg" data-testid="guide-question">{q.name}</p>
          {q.answers.map((a) => (
            <button key={a.value} className={`${btn} flex items-center gap-3`} data-testid="guide-answer" onClick={() => setAnswers({ ...answers, [q.attributeId]: a.value })}>
              {a.hex && <i className="inline-block size-4 rounded-full border border-line" style={{ background: a.hex }} />}
              <span className="flex-1">{a.label}</span>
              <span className="font-mono text-xs text-muted">{a.count}</span>
            </button>
          ))}
          <button className="text-sm text-muted underline underline-offset-4 hover:text-ink" data-testid="guide-skip" onClick={() => setSkipped([...skipped, q.attributeId])}>Omitir</button>
        </>
      ) : null}

      {(!q || results.length <= 3) && (
        <div className="space-y-2 pt-2" data-testid="guide-results">
          {results.map(({ model, variants }) => {
            const pre = answersFor(items, model.id, answers);
            return (
              <div key={model.id} className="border border-line bg-white">
                <button className="w-full px-4 py-3 text-left hover:bg-paper" data-testid="guide-pick" onClick={() => onPick(model.id, pre)}>
                  <span className="block text-lg">{model.name}</span>
                  <span className="block text-sm text-muted">{model.tagline}</span>
                </button>
                {variants.map((v) => (
                  <button key={v.id} className="block w-full border-t border-line px-4 py-2 text-left text-sm hover:bg-paper" data-testid="guide-pick-variant" onClick={() => onPick(model.id, pre, v)}>
                    <span className="font-mono">{v.code}</span> · {v.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
