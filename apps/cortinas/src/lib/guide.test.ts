import { describe, expect, it } from "vitest";
import { answersFor, guideItems, guideResults, matches, nextQuestion } from "./guide";
import { TELA, catalog as c } from "./test-catalog";

describe("ayúdame a elegir", () => {
  const items = guideItems(c, 1);
  it("pregunta con respuestas que existen y cuenta productos", () => {
    const q = nextQuestion(c, items, {}, [])!;
    expect(q).not.toBeNull();
    for (const a of q.answers) expect(a.count).toBeGreaterThan(0);
  });
  it("cada respuesta reduce la lista y nunca deja cero", () => {
    const q = nextQuestion(c, items, {}, [])!;
    const a = q.answers[0];
    const res = guideResults(items, { [q.attributeId]: a.value });
    expect(res.length).toBe(a.count);
    expect(res.length).toBeGreaterThan(0);
  });
  it("tela Arena (blackout) deja solo Roller Blackout y precarga la respuesta", () => {
    const res = guideResults(items, { [TELA]: 6 });
    expect(res.map((r) => r.model.id)).toEqual([2]);
    expect(answersFor(items, 2, { [TELA]: 6 })).toEqual({ [TELA]: 6 });
    expect(matches(items, { [TELA]: 999 })).toEqual([]);
  });
  it("se puede omitir una pregunta", () => {
    const q = nextQuestion(c, items, {}, [])!;
    const q2 = nextQuestion(c, items, {}, [q.attributeId]);
    expect(q2?.attributeId).not.toBe(q.attributeId);
  });
});
