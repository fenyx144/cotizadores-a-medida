/**
 * Recorre los flujos principales con Playwright (headless), guarda capturas
 * en /screenshots/cortinas y verifica el flujo completo de punta a punta:
 * registro -> proyecto -> subir plano PDF -> calibrar -> anotar -> configurar
 * (multiselección) -> importar CSV -> resumen -> PDF/Excel -> enviar ->
 * aparece en el admin con su plano -> comentario por anotación -> exportes.
 *
 * Uso (con la app arrancada): BASE_URL=http://localhost:3000 pnpm screenshots
 */
import { chromium, type Page } from "@playwright/test";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve(__dirname, "../../../screenshots/cortinas");
const ASSETS = path.resolve(__dirname, "../assets-src/planos");

async function shot(page: Page, name: string, fullPage = true) {
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log("captura", name);
}

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(`Falló: ${msg}`);
  console.log("ok", msg);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("Error en página:", e.message));
  page.on("dialog", (d) => d.accept());

  // --- Sitio público -------------------------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "01-inicio");
  await shot(page, "01b-inicio-portada", false);
  await page.goto(`${BASE}/catalogo`, { waitUntil: "networkidle" });
  await shot(page, "02-catalogo", false);
  await page.goto(`${BASE}/catalogo?uso=salud&tipo=enrollable`, { waitUntil: "networkidle" });
  await shot(page, "02b-catalogo-filtros", false);
  await page.goto(`${BASE}/catalogo/roller-screen`, { waitUntil: "networkidle" });
  await shot(page, "03-ficha-producto");
  await page.goto(`${BASE}/proyectos`, { waitUntil: "networkidle" });
  await shot(page, "04-proyectos");

  // Particulares (sin cuenta)
  await page.goto(`${BASE}/particulares`, { waitUntil: "networkidle" });
  await page.getByLabel("Nombre").fill("Lucía Torres");
  await page.getByLabel("Teléfono").fill("987 111 222");
  await page.getByLabel("Correo").fill(`lucia${Date.now()}@ejemplo.pe`);
  await page.getByLabel("Distrito").fill("Yanahuara");
  await page.getByLabel("Dirección").fill("Dirección de demostración 2");
  await page.getByRole("button", { name: "Agregar ventana" }).click();
  await page.getByLabel("Ambiente").nth(1).fill("Sala");
  await shot(page, "05-particulares", false);
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await page.waitForURL(/gracias/);
  check(await page.getByRole("heading", { name: "Recibimos su solicitud." }).isVisible(), "cotización rápida de particular enviada");

  // --- Cliente demo: proyecto con plano de 50 ventanas ------------------------
  await page.goto(`${BASE}/cliente/ingresar`, { waitUntil: "networkidle" });
  await page.getByLabel("Correo").fill("cliente@demo.com");
  await page.getByLabel("Contraseña").fill("demo1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(`${BASE}/cliente`);
  await shot(page, "06-area-cliente");
  await page.getByRole("link", { name: "Pabellón A — cortinas para aulas" }).click();
  await page.waitForSelector(".leaflet-container");
  await page.waitForTimeout(1200);
  const marks = await page.locator("[data-annotation]").count();
  check(marks >= 50, `plano demo con ${marks} anotaciones`);
  await shot(page, "07-mi-proyecto-plano");
  // Clic en la lista lateral: el visor se acerca a la ventana
  await page.getByTestId("annotation-list").getByRole("button").nth(4).click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "07b-plano-zoom-ventana");
  await page.getByRole("button", { name: "← Volver a la lista" }).click();
  // Multiselección: todas las sin configurar -> misma configuración
  await page.getByRole("button", { name: "Seleccionar las sin configurar" }).click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await shot(page, "07c-plano-multiseleccion");
  await page.getByRole("button", { name: /^Aplicar a \d+/ }).click();
  await page.getByTestId("editor-message").waitFor();
  check((await page.getByTestId("editor-message").textContent())?.includes("aplicada"), "configuración aplicada en bloque");
  await page.getByRole("tab", { name: "Ubicaciones y líneas" }).click();
  await page.getByTestId("location-tree").getByRole("button", { name: /Aula 101/ }).click();
  await page.getByTestId("lines-table").locator("tbody tr").first().click();
  await shot(page, "08-ubicaciones-lineas", false);
  await page.getByRole("tab", { name: "Resumen y envío" }).click();
  await shot(page, "09-resumen", false);
  await page.goto(`${BASE}/cliente`);
  await page.getByRole("button", { name: "Salir" }).click();

  // --- Flujo completo con un cliente nuevo -------------------------------------
  const email = `compras${Date.now()}@ejemplo.pe`;
  await page.goto(`${BASE}/cliente/registro`, { waitUntil: "networkidle" });
  await page.getByLabel("Institución o empresa").fill("Colegio Prueba Headless");
  await page.getByLabel("RUC").fill("20600011122");
  await page.getByLabel("Teléfono").fill("959 333 444");
  await page.getByLabel("Nombre de contacto").fill("Ana Prueba");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("prueba1234");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL(`${BASE}/cliente`);
  await page.getByLabel("Nombre del proyecto").fill("Pabellón C — prueba completa");
  await page.getByLabel("Distrito").selectOption("Cayma");
  await page.getByLabel("Dirección de la obra").fill("Av. Cayma 900");
  await page.getByRole("button", { name: "Crear y abrir" }).click();
  await page.waitForURL(/\/proyecto\/\d+/);
  const projectUrl = page.url();
  const projectId = projectUrl.split("/").pop()!.split("?")[0];

  // Subir el plano en PDF (se convierte a PNG en el navegador)
  await page.getByRole("tab", { name: "Plano y fotos" }).click();
  await page.getByTestId("plan-file").setInputFiles(path.join(ASSETS, "plano-pabellon-a.pdf"));
  await page.waitForSelector(".leaflet-container", { timeout: 60000 });
  await page.waitForTimeout(1500);
  check(true, "plano PDF convertido y subido");
  const box = (await page.getByTestId("plan-viewer").boundingBox())!;
  const at = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;

  // Calibrar: dos clics y la distancia real
  await page.getByRole("button", { name: "Calibrar" }).click();
  await page.mouse.click(...at(0.2, 0.5));
  await page.mouse.click(...at(0.35, 0.5));
  await page.getByTestId("calib-meters").fill("12");
  await page.getByRole("button", { name: "Guardar escala" }).click();
  await page.getByText("Escala guardada.").waitFor();
  check(true, "escala calibrada");

  // Rectángulos (la herramienta queda en Rectángulo tras calibrar)
  for (const fx of [0.3, 0.4, 0.5]) {
    await page.mouse.move(...at(fx, 0.3));
    await page.mouse.down();
    await page.mouse.move(...at(fx + 0.04, 0.33), { steps: 5 });
    await page.mouse.up();
    await page.getByRole("button", { name: "← Volver a la lista" }).waitFor();
    await page.getByRole("button", { name: "← Volver a la lista" }).click();
  }
  // Puntos
  await page.getByRole("button", { name: "Punto" }).click();
  for (const fx of [0.6, 0.7]) {
    await page.mouse.click(...at(fx, 0.62));
    await page.getByRole("button", { name: "← Volver a la lista" }).waitFor();
    await page.getByRole("button", { name: "← Volver a la lista" }).click();
  }
  const created = await page.locator("[data-annotation]").count();
  check(created === 5, `5 anotaciones creadas (${created})`);
  // Ancho sugerido por la escala en el primer rectángulo
  await page.getByTestId("annotation-list").getByRole("button").first().click();
  const suggestedWidth = await page.locator('input[name="width"]').inputValue();
  check(Number(suggestedWidth) > 0, `ancho sugerido desde el plano calibrado: ${suggestedWidth} cm`);
  await page.getByRole("button", { name: "← Volver a la lista" }).click();
  // Configurar todas a la vez (los puntos sin medidas reciben 180×160)
  await page.getByRole("button", { name: "Mover" }).click();
  await page.getByRole("button", { name: "Seleccionar las sin configurar" }).click();
  await page.locator('select[name="modelId"]').selectOption({ label: "Roller Blackout" });
  await page.locator('input[name="width"]').fill("180");
  await page.locator('input[name="height"]').fill("160");
  await page.getByRole("button", { name: /^Aplicar a 5/ }).click();
  await page.getByText("Configuración aplicada a 5 ventanas.").waitFor();
  check(true, "5 ventanas configuradas con multiselección");
  // Observación: una nota en una ventana
  await page.getByTestId("annotation-list").getByRole("button").nth(3).click();
  await page.getByPlaceholder(/ventana con reja/).fill("Ventana alta, sobre la puerta");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await page.getByText("Cambios guardados.").waitFor();
  await page.getByRole("button", { name: "← Volver a la lista" }).click().catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "10-plano-subido-anotado");

  // Importar CSV de medidas
  await page.getByRole("tab", { name: "Importar medidas" }).click();
  await page.getByTestId("import-file").setInputFiles(path.join(ASSETS, "medidas-pabellon-c.csv"));
  await page.getByTestId("import-summary").waitFor();
  const summaryText = await page.getByTestId("import-summary").textContent();
  check(summaryText?.includes("5 filas válidas") && summaryText.includes("1 con errores"), `vista previa CSV: ${summaryText}`);
  await shot(page, "11-importar-csv", false);
  await page.getByRole("button", { name: "Importar 5 filas" }).click();
  await page.getByText("5 filas importadas.").waitFor();
  await page.getByRole("tab", { name: "Ubicaciones y líneas" }).click();
  await page.getByRole("button", { name: /Todas las ventanas/ }).click();
  const windows = Number(await page.getByTestId("header-windows").textContent());
  check(windows === 18, `cortinas tras importar: ${windows} (5 del plano + 13 del CSV)`);
  // Duplicar una ubicación (Aula 201 -> Aula 202… ya existe; usamos Laboratorio)
  await page.getByTestId("location-tree").getByRole("button", { name: /Laboratorio/ }).click();
  await page.getByRole("button", { name: "Duplicar" }).click();
  await page.getByText("Ubicación duplicada con sus ventanas.").waitFor();
  check(true, "ubicación duplicada con sus líneas");
  await shot(page, "12-ubicaciones-importadas", false);

  // Resumen, PDF y Excel
  await page.getByRole("tab", { name: "Resumen y envío" }).click();
  await page.getByTestId("summary-totals").waitFor();
  await shot(page, "13-resumen-nuevo", false);
  const pdf = await page.request.get(`${BASE}/api/proyecto/${projectId}/pdf`);
  check(pdf.status() === 200 && pdf.headers()["content-type"] === "application/pdf", "PDF del cliente (200, application/pdf)");
  const xlsx = await page.request.get(`${BASE}/api/proyecto/${projectId}/xlsx`);
  check(xlsx.status() === 200 && (await xlsx.body())[0] === 0x50, "Excel del cliente (200, xlsx)");
  await page.getByTestId("send-project").click();
  await page.getByText("Proyecto enviado. Le escribiremos pronto.").waitFor();
  check(await page.getByText(/solo lectura/).isVisible(), "proyecto enviado y en solo lectura");

  // --- Admin ---------------------------------------------------------------
  const admin = await ctx.newPage();
  admin.on("dialog", (d) => d.accept());
  await admin.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await admin.getByRole("button", { name: "Entrar" }).click();
  await admin.waitForURL(`${BASE}/admin`);
  check(await admin.getByTestId("board").getByText("Pabellón C — prueba completa").isVisible(), "el proyecto enviado aparece en el tablero del admin");
  await shot(admin, "14-admin-tablero", false);
  await admin.getByText("Pabellón C — prueba completa").click();
  await admin.waitForSelector(".leaflet-container");
  await admin.waitForTimeout(1200);
  check((await admin.locator("[data-annotation]").count()) === 5, "el admin ve el plano con sus 5 anotaciones");
  await admin.locator("aside").getByRole("button").nth(1).click();
  await admin.getByTestId("admin-comment").fill("Confirmar alto: el vano parece de 1,40 m.");
  await admin.getByRole("button", { name: "Comentar y observar" }).click();
  await admin.getByText("Confirmar alto: el vano parece de 1,40 m.").waitFor();
  check(true, "comentario por anotación y estado observada");
  await admin.locator(".leaflet-container").scrollIntoViewIfNeeded();
  await shot(admin, "15-admin-proyecto-plano", false);
  await shot(admin, "15b-admin-proyecto-completo");
  const apdf = await admin.request.get(`${BASE}/api/proyecto/${projectId}/pdf`);
  check(apdf.status() === 200, "PDF desde el admin (200)");
  await writeFile("/tmp/cortinas-proyecto.pdf", await apdf.body());
  const axlsx = await admin.request.get(`${BASE}/api/proyecto/${projectId}/xlsx`);
  check(axlsx.status() === 200, "Excel desde el admin (200)");
  await writeFile("/tmp/cortinas-proyecto.xlsx", await axlsx.body());
  // PDF del proyecto demo (50 ventanas) para la captura del plano exportado
  const demoPdf = await admin.request.get(`${BASE}/api/proyecto/1/pdf`);
  await writeFile("/tmp/cortinas-demo.pdf", await demoPdf.body());

  // El cliente ve la observación en su proyecto
  await page.goto(projectUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".leaflet-container");
  check((await page.getByTestId("annotation-list").getByText("V").count()) > 0, "el cliente ve su proyecto enviado");

  await admin.goto(`${BASE}/admin/catalogo/productos`, { waitUntil: "networkidle" });
  await shot(admin, "16-admin-productos", false);

  // Móvil
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const m = await mobile.newPage();
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(m, "17-movil-inicio", false);

  await browser.close();
  console.log("Flujo completo verificado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
