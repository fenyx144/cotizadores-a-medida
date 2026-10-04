/**
 * Recorre los flujos principales con un navegador headless (Playwright) y
 * guarda capturas en /screenshots. También sirve como prueba end-to-end:
 * configurador -> solicitar visita -> aparece en el admin; overlay; CRUD.
 *
 * Uso: con la app arrancada (pnpm start), ejecutar:
 *   BASE_URL=http://localhost:3000 pnpm screenshots
 */
import { chromium, type Page } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve(__dirname, "../../../screenshots");

async function shot(page: Page, name: string, fullPage = true) {
  // Forzamos que se vean los elementos con animación de aparición.
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log("📸", name);
}

function nextWeekday(days = 3) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("Error en página:", e.message));

  // 1. Inicio
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "01-inicio");
  await shot(page, "01b-inicio-hero", false);

  // 2. Modelos
  await page.goto(`${BASE}/modelos`, { waitUntil: "networkidle" });
  await shot(page, "02-modelos", false);

  // 3. Configurador: elegimos Cobijo, lona a rayas, antracita, sensor
  await page.goto(`${BASE}/configurador`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Cobijo/ }).click();
  await page.getByRole("button", { name: "Rayas Mediterráneo" }).click();
  await page.getByRole("button", { name: "Antracita" }).click();
  await page.getByLabel("Motor + sensor viento y sol").check();
  await page.getByLabel("Ancho").fill("520");
  await page.getByText("Ver desglose").click();
  await shot(page, "03-configurador", false);

  // 4. Pruébalo en casa (usa la configuración guardada)
  await page.getByRole("button", { name: "Probarlo sobre una foto de mi casa" }).click();
  await page.waitForURL("**/pruebalo");
  await page.waitForTimeout(800);
  const handle = page.getByRole("button", { name: "Mover esquina 3" });
  const box = await handle.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 12, box.y + 8, { steps: 5 });
    await page.mouse.up();
  }
  await shot(page, "04-pruebalo", false);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar imagen" }).click()]);
  await download.saveAs(path.join(OUT, "04b-pruebalo-descarga.jpg"));
  console.log("⬇️  composición descargada");

  // 5. Solicitar visita con foto
  await page.goto(`${BASE}/solicitar-visita`, { waitUntil: "networkidle" });
  await page.getByLabel("Código postal").fill("2011 AB");
  await page.getByText("Trabajamos en tu zona").waitFor();
  await page.getByLabel("Localidad").fill("Haarlem");
  await page.getByLabel("Calle y número").fill("Kleine Houtstraat 21");
  await page.getByLabel("Fecha preferida").fill(nextWeekday());
  await page.getByLabel("Nombre").fill("Eva Hoekstra (demo)");
  await page.getByLabel("Correo electrónico").fill("eva@example.nl");
  await page.getByLabel("Teléfono").fill("+31 6 1111 2222");
  await page.locator('input[type="file"]').setInputFiles(path.resolve(__dirname, "../assets-src/fachada-demo.jpg"));
  await page.locator('input[name="consent"]').check();
  await shot(page, "05-solicitar-visita", false);
  await page.getByRole("button", { name: "Solicitar visita" }).click();
  await page.waitForURL("**/gracias**");
  const ref = new URL(page.url()).searchParams.get("ref");
  console.log("✅ lead creado:", ref);
  await shot(page, "05b-gracias", false);

  // 6. Asistente y muestrario
  await page.goto(`${BASE}/asistente`, { waitUntil: "networkidle" });
  await page.getByText("En la terraza, pegada a la casa").click();
  await page.getByText("Bastante, casi todos los días").click();
  await page.getByText("Entre 1.500 y 4.000 €").click();
  await shot(page, "06-asistente", false);
  await page.goto(`${BASE}/muestrario`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Terracota/ }).click();
  await shot(page, "07-muestrario", false);

  // 7. Admin
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await shot(page, "08-admin-login", false);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${BASE}/admin`);
  await page.getByText("Eva Hoekstra (demo)").first().waitFor();
  await shot(page, "09-admin-solicitudes", false);
  await page.getByText("Eva Hoekstra (demo)").first().click();
  await page.waitForURL("**/admin/leads/**");
  await page.locator('textarea[name="body"]').fill("Llamar el lunes por la mañana. Fachada de ladrillo.");
  await page.getByRole("button", { name: "Añadir nota" }).click();
  await page.getByText("Llamar el lunes").waitFor();
  await shot(page, "10-admin-detalle");
  const pdf = await page.request.get(page.url().replace("/admin/leads/", "/api/admin/leads/") + "/pdf");
  console.log("📄 PDF:", pdf.status(), pdf.headers()["content-type"], (await pdf.body()).length, "bytes");

  await page.goto(`${BASE}/admin/calendario`, { waitUntil: "networkidle" });
  await shot(page, "11-admin-calendario", false);

  // CRUD: crear una lona, comprobar que aparece y borrarla
  await page.goto(`${BASE}/admin/catalogo/telas`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Añadir lona" }).click();
  const form = page.locator("form").last();
  await form.locator("label", { hasText: "Nombre" }).locator("input").fill("Salvia (prueba)");
  await form.locator("label", { hasText: "Código" }).locator("input").fill("SL-240");
  await form.locator("label", { hasText: "Colección" }).locator("input").fill("Tierra");
  await form.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("cell", { name: "Salvia (prueba)" }).waitFor();
  await page.getByRole("row", { name: /Salvia/ }).getByRole("button", { name: "Editar" }).click();
  await shot(page, "12-admin-lonas-crud", false);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("row", { name: /Salvia/ }).getByRole("button", { name: "Eliminar" }).click();
  await page.getByRole("cell", { name: "Salvia (prueba)" }).waitFor({ state: "detached" });
  console.log("✅ CRUD de lonas OK");

  await page.goto(`${BASE}/admin/catalogo/precios`, { waitUntil: "networkidle" });
  await shot(page, "13-admin-reglas-precio", false);

  // Móvil
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(mobile, "14-movil-inicio", false);
  await mobile.goto(`${BASE}/configurador`, { waitUntil: "networkidle" });
  await shot(mobile, "15-movil-configurador", false);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
