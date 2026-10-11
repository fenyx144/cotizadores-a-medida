import { chromium } from "@playwright/test";
const B = "https://cotizadores-a-medida.vercel.app", PID = 18;
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 1000 } });
const a = await ctx.newPage();
a.on("dialog", (d) => d.accept());
const errs = []; a.on("pageerror", (e) => errs.push(e.message));
await a.goto(B + "/admin/login"); await a.fill("input[name=email]", "demo@demo.com"); await a.fill("input[name=password]", "demo1234"); await a.press("input[name=password]", "Enter");
await a.waitForURL((u) => !u.pathname.includes("login"));
console.log("menú:", (await a.locator("nav a, aside a").allTextContents()).map((s) => s.trim()).filter(Boolean).join(" | "));
await a.goto(B + "/admin/guia"); console.log("guía pasos:", await a.locator("ol").nth(1).locator("li").count(), "diagrama:", (await a.getByTestId("guide-diagram").textContent()));
await a.screenshot({ path: "/tmp/guia.png" });
// nuevo valor de Tela
await a.goto(B + "/admin/catalogo/atributos?atributo=1");
const vals = a.getByTestId("attribute-values");
if (!(await vals.locator("td", { hasText: "SC-305" }).count())) {
await vals.getByRole("button", { name: "Añadir valor" }).click();
const form = vals.locator("form");
await form.getByLabel("Nombre").fill("Screen Arena 3%"); await form.getByLabel("Código").fill("SC-305");
await form.getByLabel("Recargo (S/)").fill("6"); await form.getByLabel("Recargo por").selectOption("por_m2"); await form.getByLabel("Solo para").fill("screen,mixto");
await form.getByRole("button", { name: "Guardar" }).click(); await a.waitForTimeout(2000);
}
console.log("valor creado:", await vals.locator("td", { hasText: "SC-305" }).count());
// nuevo atributo Soporte
await a.getByRole("button", { name: "Añadir atributo" }).click();
const af = a.locator("form", { has: a.getByRole("button", { name: "Guardar" }) }).first();
await af.getByLabel("Nombre").fill("Soporte"); await af.getByLabel("Orden en el configurador").fill("7");
await af.getByRole("button", { name: "Guardar" }).click(); await a.waitForTimeout(2000);
await a.reload();
await a.getByRole("link", { name: "Soporte" }).click(); await a.waitForTimeout(1500);
for (const n of ["Techo", "Pared"]) {
  const v = a.getByTestId("attribute-values");
  await v.getByRole("button", { name: "Añadir valor" }).click();
  await v.locator("form").getByLabel("Nombre").fill(n);
  await v.locator("form").getByRole("button", { name: "Guardar" }).click(); await a.waitForTimeout(1500);
}
console.log("valores Soporte:", await a.getByTestId("attribute-values").locator("tbody tr").count());
// asignar a categoría
await a.goto(B + "/admin/catalogo/familias");
await a.locator("tr", { hasText: "Enrollable estándar" }).getByRole("button", { name: "Editar" }).click();
await a.getByLabel("Pedir Soporte").check(); await a.getByLabel("Soporte obligatorio").uncheck();
await a.locator("form").getByRole("button", { name: "Guardar" }).click(); await a.waitForTimeout(2000);
console.log("categoría:", (await a.locator("tr", { hasText: "Enrollable estándar" }).textContent()).slice(0, 160));
await a.screenshot({ path: "/tmp/familias.png" });
// regla Techo ↔ Cadena
await a.goto(B + "/admin/catalogo/reglas");
const cr = a.getByTestId("constraint-rules");
await cr.getByRole("button", { name: "Añadir regla" }).click();
const rf = cr.locator("form");
await rf.getByLabel("Nombre").fill("PRUEBA techo sin cadena");
await rf.getByLabel("Si se elige (A)").selectOption({ label: "Soporte · Techo" });
await rf.getByLabel("Bloquear (B)").selectOption({ label: "Accionamiento · Cadena (manual)" });
await rf.getByLabel("Mensaje para el cliente").fill("Con soporte a techo, elija motor.");
await rf.getByRole("button", { name: "Guardar" }).click(); await a.waitForTimeout(2000);
console.log("regla creada:", await cr.locator("td", { hasText: "PRUEBA techo" }).count());
// cliente
const c = await (await br.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
c.on("pageerror", (e) => errs.push("cliente: " + e.message));
await c.goto(B + "/cliente/ingresar"); await c.fill("input[name=email]", "cliente@demo.com"); await c.fill("input[name=password]", "demo1234"); await c.press("input[name=password]", "Enter");
await c.waitForURL((u) => !u.pathname.includes("ingresar"));
await c.goto(B + "/catalogo/roller-screen");
const conf = c.getByTestId("configurator");
console.log("campos:", (await conf.locator("label > span").allTextContents()).join(" | "));
console.log("tela nueva en ficha:", (await conf.getByLabel("Tela").locator("option").allTextContents()).filter((t) => t.includes("SC-305")));
await conf.getByLabel("Soporte").selectOption({ label: "Techo" }); await c.waitForTimeout(300);
console.log("cadena con techo:", (await conf.getByLabel("Accionamiento").locator("option").allTextContents()).join(" / "));
await conf.getByLabel("Accionamiento").selectOption({ index: 1 }).catch(() => {});
await conf.getByLabel("Tela").selectOption({ label: "Screen Arena 3% (SC-305)" });
await conf.locator("select[name=projectId]").selectOption(String(PID));
console.log("precio:", await c.getByTestId("config-price").textContent());
await c.screenshot({ path: "/tmp/ficha.png", fullPage: true });
await c.getByRole("button", { name: "Agregar al proyecto" }).click(); await c.waitForURL(/tab=ubicaciones/, { timeout: 15000 });
await c.waitForTimeout(1500);
console.log("cabecera tabla:", (await c.locator("[data-testid=lines-grid] thead th").allTextContents()).filter(Boolean).join(" | "));
// pegar en la tabla
await c.getByTestId("lines-grid").click({ position: { x: 5, y: 5 } });
await c.evaluate(() => {
  const dt = new DataTransfer(); dt.setData("text/plain", "Aula 2\tRoller Blackout\t280\t150\t1\tArena\tNegro mate\tCadena\n");
  document.querySelector("[data-testid=lines-grid]").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
});
await c.waitForTimeout(800);
console.log("errores pegado:", (await c.getByTestId("cell-error").allTextContents()).join(" / "));
await c.screenshot({ path: "/tmp/tabla.png" });
// demo: tabla del proyecto 1 y editor del plano
await c.goto(B + "/proyecto/1?tab=ubicaciones"); await c.waitForTimeout(1500);
console.log("proyecto 1 filas:", await c.getByTestId("grid-row").count(), "errores:", await c.getByTestId("cell-error").count());
await c.goto(B + "/proyecto/1?tab=plano"); await c.waitForTimeout(2500);
await c.getByTestId("annotation-list").locator("button").first().click(); await c.waitForTimeout(500);
console.log("editor en plano:", (await c.getByTestId("line-editor").locator("label > span").allTextContents()).slice(0, 8).join(" | "));
// admin
await a.goto(`${B}/admin/proyectos/${PID}`);
console.log("admin opciones:", (await a.locator("tbody tr").first().textContent()).replace(/\s+/g, " ").slice(0, 200));
const x = await a.request.get(`${B}/api/proyecto/${PID}/xlsx`); const p = await a.request.get(`${B}/api/proyecto/${PID}/pdf`); const t = await a.request.get(`${B}/api/plantilla-medidas`);
console.log("xlsx", x.status(), "pdf", p.status(), "plantilla:", (await t.text()).split("\n")[0]);
console.log("errores JS:", errs);
await br.close();
