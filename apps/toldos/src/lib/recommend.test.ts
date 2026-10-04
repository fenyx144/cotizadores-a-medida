import { describe, expect, it } from "vitest";
import { recommend } from "./recommend";

describe("asistente", () => {
  it("jardín + sombra total + presupuesto amplio -> pérgola", () => {
    expect(recommend({ place: "jardin", shade: "total", budget: "amplio" })[0].type).toBe("pergola");
  });
  it("ventanas -> vertical", () => {
    expect(recommend({ place: "ventanas", shade: "algo", budget: "medio" })[0].type).toBe("vertical");
  });
  it("terraza con presupuesto ajustado -> retráctil", () => {
    expect(recommend({ place: "terraza", shade: "algo", budget: "ajustado" })[0].type).toBe("retractil");
  });
  it("devuelve siempre los cuatro tipos", () => {
    expect(recommend({ place: "balcon", shade: "mucha", budget: "medio" })).toHaveLength(4);
  });
});
