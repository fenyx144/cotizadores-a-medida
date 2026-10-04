/**
 * Lógica del "Asistente para indecisos".
 * Tres respuestas -> puntuamos cada tipo de modelo y devolvemos el orden.
 * Es una función pura, así que se puede testear (ver recommend.test.ts).
 */
export type Place = "terraza" | "balcon" | "jardin" | "ventanas";
export type ShadeAmount = "algo" | "mucha" | "total";
export type Budget = "ajustado" | "medio" | "amplio";

export interface Answers {
  place: Place;
  shade: ShadeAmount;
  budget: Budget;
}

export interface Recommendation {
  type: string;
  score: number;
  reason: string;
}

const REASONS: Record<string, string> = {
  retractil: "Sencillo, ligero y el más económico para dar sombra a una terraza.",
  cofre: "La lona queda protegida dentro del cofre: dura más y se ve limpio en fachada.",
  vertical: "Corta el sol bajo de la tarde y da intimidad sin quitar vistas.",
  pergola: "Una habitación más al aire libre, con sombra fija y estructura propia.",
};

export function recommend(a: Answers): Recommendation[] {
  const score: Record<string, number> = { retractil: 0, cofre: 0, vertical: 0, pergola: 0 };

  // ¿Dónde?
  if (a.place === "terraza") { score.retractil += 3; score.cofre += 3; score.pergola += 1; }
  if (a.place === "balcon") { score.vertical += 3; score.retractil += 2; score.cofre += 1; }
  if (a.place === "jardin") { score.pergola += 4; score.retractil += 1; }
  if (a.place === "ventanas") { score.vertical += 5; }

  // ¿Cuánta sombra?
  if (a.shade === "algo") { score.retractil += 2; score.vertical += 1; }
  if (a.shade === "mucha") { score.cofre += 2; score.retractil += 1; score.pergola += 1; }
  if (a.shade === "total") { score.pergola += 3; score.cofre += 1; }

  // ¿Presupuesto?
  if (a.budget === "ajustado") { score.retractil += 2; score.vertical += 2; score.pergola -= 3; }
  if (a.budget === "medio") { score.cofre += 2; score.retractil += 1; }
  if (a.budget === "amplio") { score.pergola += 2; score.cofre += 1; }

  return Object.entries(score)
    .map(([type, s]) => ({ type, score: s, reason: REASONS[type] }))
    .sort((x, y) => y.score - x.score);
}
