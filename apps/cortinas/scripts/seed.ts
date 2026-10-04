/**
 * Datos de demostración de Cota. Uso: pnpm db:seed
 * Borra y vuelve a crear: catálogo (productos, telas, perfiles, reglas),
 * admin demo, cliente demo y proyectos de ejemplo. El proyecto principal
 * (colegio mediano, Pabellón A) incluye el plano generado por
 * scripts/make-plan.mjs con 50 ventanas anotadas.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@portafolio/core/db/client";
import { hashPassword } from "@portafolio/core/auth";
import { getStorage } from "@portafolio/core/storage";
import { projectReference, type ProjectStatus } from "@portafolio/core/projects";
import type { PricingRule, Drive } from "@portafolio/core/pricing";
import { priceLine, fabricsFor, type CatalogData } from "../src/lib/line-price";

const db = getDb();

async function main() {
  console.log("Limpiando tablas…");
  await db.execute(
    sql`TRUNCATE line_comments, lines, plans, locations, projects, clients, price_rules, frame_colors, fabrics, product_models, admin_users RESTART IDENTITY CASCADE`,
  );

  // --- Catálogo -----------------------------------------------------------
  // En cortinas usamos minProjection/maxProjection como alto mínimo/máximo.
  const models = await db
    .insert(schema.productModels)
    .values([
      {
        slug: "roller-screen", name: "Roller Screen 5%", type: "enrollable", material: "screen", uses: "educacion,oficinas,salud", sortOrder: 1,
        image: "/img/producto-roller.webp", gallery: ["/img/producto-detalle.webp", "/img/sector-oficinas.webp"],
        tagline: "Filtra el sol y deja ver hacia afuera.",
        description: "Tela screen con 5% de apertura: corta el reflejo en pizarras y pantallas sin apagar el aula. Tubo de aluminio de 38 mm y cadena con tope de seguridad.",
        minWidth: 40, maxWidth: 300, minProjection: 40, maxProjection: 320, basePrice: 60, pricePerM2: 85,
      },
      {
        slug: "roller-blackout", name: "Roller Blackout", type: "enrollable", material: "blackout", uses: "educacion,salud,oficinas", sortOrder: 2,
        image: "/img/sector-educacion.webp", gallery: ["/img/proyecto-colegio.webp"],
        tagline: "Oscuridad total para proyectar.",
        description: "Tela de tres capas que bloquea la luz. Para laboratorios, salas de cómputo, auditorios y tópicos. Opcional con guías laterales.",
        minWidth: 40, maxWidth: 300, minProjection: 40, maxProjection: 320, basePrice: 60, pricePerM2: 95,
      },
      {
        slug: "doble-roller", name: "Doble roller día y noche", type: "dual", material: "mixto", uses: "oficinas,educacion", sortOrder: 3,
        image: "/img/producto-detalle.webp", gallery: ["/img/producto-roller.webp"],
        tagline: "Screen y blackout en un mismo soporte.",
        description: "Dos telas en un soporte doble: screen para el día a día y blackout para presentaciones. Cada una con su cadena.",
        minWidth: 60, maxWidth: 280, minProjection: 60, maxProjection: 300, basePrice: 120, pricePerM2: 130,
      },
      {
        slug: "vertical-pvc", name: "Vertical PVC 89 mm", type: "vertical", material: "pvc", uses: "salud,educacion,oficinas", sortOrder: 4,
        image: "/img/sector-salud.webp", gallery: ["/img/producto-vertical.webp"],
        tagline: "Lamas lavables para ventanales anchos.",
        description: "Lamas de PVC de 89 mm que giran 180°. Se limpian con un paño húmedo: pensadas para consultorios y salas de espera.",
        minWidth: 60, maxWidth: 500, minProjection: 60, maxProjection: 350, basePrice: 50, pricePerM2: 70,
      },
      {
        slug: "roller-gran-formato", name: "Roller gran formato", type: "enrollable", material: "screen", uses: "educacion,oficinas", sortOrder: 5,
        image: "/img/hero-aula-magna.webp", gallery: ["/img/proyecto-universidad.webp"],
        tagline: "Para auditorios y fachadas de doble altura.",
        description: "Tubo reforzado de 70 mm para paños de hasta 5 m de ancho. Se recomienda con motor y control centralizado por fachada.",
        minWidth: 250, maxWidth: 500, minProjection: 200, maxProjection: 600, basePrice: 220, pricePerM2: 95,
      },
      {
        slug: "persiana-aluminio", name: "Persiana de aluminio 25 mm", type: "veneciana", material: "aluminio", uses: "oficinas,salud", sortOrder: 6,
        image: "/img/producto-veneciana.webp", gallery: ["/img/producto-blackout.webp"],
        tagline: "Regula la luz lama por lama.",
        description: "Lamas de aluminio de 25 mm con varilla para orientar y cordón para subir. Ocupa poco y resiste el uso diario.",
        minWidth: 40, maxWidth: 240, minProjection: 40, maxProjection: 260, basePrice: 40, pricePerM2: 120,
      },
    ])
    .returning();

  const fabrics = await db
    .insert(schema.fabrics)
    .values([
      { name: "Blanco gris", code: "SC5-01", collection: "Screen 5%", hex: "#d9d8d3", types: "screen,mixto", sortOrder: 1 },
      { name: "Gris perla", code: "SC5-04", collection: "Screen 5%", hex: "#a9a9a4", types: "screen,mixto", sortOrder: 2 },
      { name: "Lino", code: "SC5-07", collection: "Screen 5%", hex: "#cbbfa8", types: "screen,mixto", sortOrder: 3 },
      { name: "Carbón", code: "SC3-09", collection: "Screen 3%", hex: "#45484c", types: "screen,mixto", surchargePerM2: 8, sortOrder: 4 },
      { name: "Blanco", code: "BK-01", collection: "Blackout", hex: "#eeeeea", types: "blackout", sortOrder: 5 },
      { name: "Arena", code: "BK-03", collection: "Blackout", hex: "#cdbb9c", types: "blackout", surchargePerM2: 6, sortOrder: 6 },
      { name: "Gris piedra", code: "BK-05", collection: "Blackout", hex: "#8c8a85", types: "blackout", surchargePerM2: 6, sortOrder: 7 },
      { name: "Perla", code: "VP-01", collection: "PVC 89 mm", hex: "#e4e1da", types: "pvc", sortOrder: 8 },
      { name: "Gris niebla", code: "VP-02", collection: "PVC 89 mm", hex: "#b9b8b3", types: "pvc", sortOrder: 9 },
      { name: "Plata", code: "AL-01", collection: "Aluminio 25 mm", hex: "#c0c2c4", types: "aluminio", sortOrder: 10 },
      { name: "Blanco", code: "AL-02", collection: "Aluminio 25 mm", hex: "#f2f2f0", types: "aluminio", sortOrder: 11 },
      { name: "Grafito", code: "AL-05", collection: "Aluminio 25 mm", hex: "#3d4044", types: "aluminio", surchargePerM2: 10, sortOrder: 12 },
    ])
    .returning();

  const frames = await db
    .insert(schema.frameColors)
    .values([
      { name: "Blanco", ral: "9016", hex: "#f1f0eb", sortOrder: 1 },
      { name: "Gris aluminio", ral: "9006", hex: "#a5a7a8", sortOrder: 2 },
      { name: "Negro mate", ral: "9005", hex: "#1c1d1f", surcharge: 15, sortOrder: 3 },
    ])
    .returning();

  const rules = (await db
    .insert(schema.priceRules)
    .values([
      { name: "Motor con mando", kind: "fijo", amount: 380, drive: "motor" },
      { name: "Motor + control centralizado", kind: "fijo", amount: 520, drive: "sensor" },
      { name: "Instalación por cortina", kind: "fijo", amount: 25 },
      { name: "Tubo reforzado (paños grandes)", kind: "por_m2", amount: 12, minArea: 6 },
    ])
    .returning()) as PricingRule[];

  const catalog: CatalogData = { models, fabrics, frames, rules };
  const bySlug = (slug: string) => models.find((m) => m.slug === slug)!;

  /** Línea configurada: calcula precio y snapshot de nombres. */
  function configured(slug: string, width: number, height: number, opts: { fabric?: string; frame?: number; drive?: Drive } = {}) {
    const model = bySlug(slug);
    const fabric = fabricsFor(catalog, model).find((f) => !opts.fabric || f.name === opts.fabric)!;
    const priced = priceLine(catalog, { modelId: model.id, fabricId: fabric.id, frameColorId: frames[opts.frame ?? 0].id, drive: opts.drive ?? "manual", width, height })!;
    return { width, height, config: priced.config, unitPrice: priced.unitPrice, status: "configurada" as const };
  }

  // --- Usuarios ------------------------------------------------------------
  await db.insert(schema.adminUsers).values({ email: "demo@demo.com", name: "Equipo Cota", passwordHash: await hashPassword("demo1234") });

  const pass = await hashPassword("demo1234");
  const clients = await db
    .insert(schema.clients)
    .values([
      { email: "cliente@demo.com", name: "María Fernanda Quispe", company: "Asociación Educativa Santa Rosa", ruc: "20456789123", phone: "959 214 780", passwordHash: pass, kind: "empresa" },
      { email: "logistica@cea.edu.pe", name: "Jorge Medina Cáceres", company: "Corporación Educativa Arequipa S.A.C.", ruc: "20601234571", phone: "054 271 330", passwordHash: pass, kind: "empresa" },
      { email: "administracion@losandes.pe", name: "Rosa Huamaní", company: "Policlínico Los Andes E.I.R.L.", ruc: "20498765431", phone: "958 112 904", passwordHash: pass, kind: "empresa" },
      { email: "oficina@valdivia.pe", name: "Carlos Valdivia", company: "Estudio Contable Valdivia & Asociados", ruc: "20512345670", phone: "974 330 118", passwordHash: pass, kind: "empresa" },
      { email: "infraestructura@udelsur.edu.pe", name: "Ing. Patricia Linares", company: "Universidad del Sur (ficticia)", ruc: "20111222333", phone: "054 600 200", passwordHash: pass, kind: "empresa" },
      { email: "lucia.paredes@gmail.com", name: "Lucía Paredes", phone: "987 654 321", kind: "particular" },
      { email: "compras@lospinos.edu.pe", name: "Elena Rojas", company: "Colegio Los Pinos", ruc: "20555666777", phone: "959 000 112", passwordHash: pass, kind: "empresa" },
    ])
    .returning();

  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

  async function createProject(p: {
    clientId: number; name: string; status: ProjectStatus; sector?: string; district: string; address: string; kind?: string; days: number;
    notes?: string; measurementRequest?: { approxWindows: number; address: string; district: string; preferredDate?: string };
  }) {
    const [row] = await db
      .insert(schema.projects)
      .values({
        clientId: p.clientId, name: p.name, status: p.status, sector: p.sector ?? "educacion", district: p.district, address: p.address,
        kind: p.kind ?? "empresa", notes: p.notes ?? "", measurementRequest: p.measurementRequest ?? null,
        createdAt: daysAgo(p.days), updatedAt: daysAgo(Math.max(0, p.days - 2)), sentAt: p.status === "borrador" ? null : daysAgo(Math.max(0, p.days - 2)),
      })
      .returning();
    await db.update(schema.projects).set({ reference: projectReference(row.id) }).where(sql`id = ${row.id}`);
    return row;
  }

  /** Proyecto sin plano: lista de ambientes con N ventanas iguales cada uno. */
  async function addRooms(projectId: number, building: string, floor: string, rooms: { room: string; qty: number; line: ReturnType<typeof configured> }[]) {
    let label = 1;
    for (const [i, r] of rooms.entries()) {
      const [loc] = await db.insert(schema.locations).values({ projectId, building, floor, room: r.room, sortOrder: i }).returning();
      await db.insert(schema.lines).values({ projectId, locationId: loc.id, label: `V${label++}`, quantity: r.qty, ...r.line, sortOrder: i });
    }
  }

  // --- Proyecto principal: colegio mediano con plano ---------------------
  const demo = clients[0];
  const main = await createProject({
    clientId: demo.id, name: "Pabellón A — cortinas para aulas", status: "borrador", district: "Cayma", address: "Calle Los Arces 220, Cayma", days: 3,
    notes: "Instalación en vacaciones de medio año (julio). Aulas con proyector: 101, 105 y 110.",
  });
  const planMeta = JSON.parse(await readFile("assets-src/planos/plano-pabellon-a.json", "utf8")) as {
    width: number; height: number; metersPerPx: number; windows: { room: string; widthCm: number; x: number; y: number; w: number; h: number }[];
  };
  const planKey = "planos/demo-pabellon-a.png";
  await getStorage().put(planKey, new Uint8Array(await readFile("assets-src/planos/plano-pabellon-a.png")), "image/png");
  const [plan] = await db
    .insert(schema.plans)
    .values({ projectId: main.id, kind: "plano", name: "Planta primer piso (A-101)", imageKey: planKey, width: planMeta.width, height: planMeta.height, metersPerPx: planMeta.metersPerPx })
    .returning();

  const roomNames = [...new Set(planMeta.windows.map((w) => w.room))];
  const locIds = new Map<string, number>();
  for (const [i, room] of roomNames.entries()) {
    const [loc] = await db.insert(schema.locations).values({ projectId: main.id, building: "Pabellón A", floor: "Piso 1", room, sortOrder: i }).returning();
    locIds.set(room, loc.id);
  }
  for (const [i, w] of planMeta.windows.entries()) {
    const width = w.widthCm + 10; // la cortina sobrepasa 5 cm por lado
    let line;
    if (w.room === "Aula 114") line = { width, height: 160, config: null, unitPrice: null, status: "sin_configurar" as const }; // pendientes
    else if (w.room === "Dirección" || w.room === "Sala de profesores") line = configured("roller-blackout", width, 150, { fabric: "Arena" });
    else if (w.room === "Tópico") line = configured("vertical-pvc", width, 150);
    else if (["Aula 101", "Aula 105", "Aula 110"].includes(w.room)) line = configured("doble-roller", width, 160, { fabric: "Gris perla" });
    else line = configured("roller-screen", width, 160, { fabric: "Gris perla" });
    await db.insert(schema.lines).values({
      projectId: main.id, locationId: locIds.get(w.room)!, planId: plan.id, label: `V${i + 1}`, shape: "rect", x: w.x, y: w.y, w: w.w, h: w.h,
      quantity: 1, sortOrder: i, note: w.room === "Aula 114" ? "Confirmar si la ventana central es fija" : "", ...line,
    });
  }

  // Segundo proyecto del mismo cliente: pide medición en obra.
  await createProject({
    clientId: demo.id, name: "Pabellón B — medición en obra", status: "enviado", district: "Cayma", address: "Calle Los Arces 220, Cayma", days: 1,
    measurementRequest: { approxWindows: 36, address: "Calle Los Arces 220, Cayma (ingreso por portón 2)", district: "Cayma", preferredDate: "2026-10-10" },
  });

  // --- Otros proyectos para el tablero del admin --------------------------
  const p2 = await createProject({ clientId: clients[1].id, name: "Sede Cayma — aulas del segundo piso", status: "enviado", district: "Cayma", address: "Av. Bolognesi 1020", days: 2 });
  await addRooms(p2.id, "Sede Cayma", "Piso 2", [
    ...Array.from({ length: 8 }, (_, i) => ({ room: `Aula ${201 + i}`, qty: 3, line: configured("roller-screen", 170, 150) })),
  ]);

  const p3 = await createProject({ clientId: clients[4].id, name: "Auditorio y pabellón C", status: "en_revision", district: "Cerro Colorado", address: "Av. Aviación 4500", days: 6 });
  await addRooms(p3.id, "Pabellón C", "Piso 1", [
    { room: "Auditorio", qty: 8, line: configured("roller-gran-formato", 420, 480, { drive: "sensor" }) },
    ...Array.from({ length: 12 }, (_, i) => ({ room: `Aula C-${101 + i}`, qty: 4, line: configured("roller-screen", 180, 160) })),
    ...Array.from({ length: 12 }, (_, i) => ({ room: `Aula C-${201 + i}`, qty: 4, line: configured("roller-screen", 180, 160) })),
    { room: "Oficinas de coordinación", qty: 14, line: configured("persiana-aluminio", 120, 140) },
  ]);
  // Observación del admin en la línea del auditorio
  const [audLine] = await db.select().from(schema.lines).where(sql`project_id = ${p3.id}`).limit(1);
  await db.update(schema.lines).set({ status: "observada" }).where(sql`id = ${audLine.id}`);
  await db.insert(schema.lineComments).values({ lineId: audLine.id, author: "Equipo Cota", role: "admin", body: "4,80 m de alto supera el tubo de 70 mm con screen. Proponemos dividir en dos paños de 2,10 m." });

  const p4 = await createProject({ clientId: clients[2].id, name: "Consultorios del piso 2", status: "cotizado", sector: "salud", district: "José Luis Bustamante y Rivero", address: "Av. Dolores 312", days: 12 });
  await addRooms(p4.id, "Local principal", "Piso 2", [
    ...Array.from({ length: 6 }, (_, i) => ({ room: `Consultorio ${i + 1}`, qty: 1, line: configured("vertical-pvc", 160, 140) })),
    { room: "Sala de espera", qty: 3, line: configured("vertical-pvc", 240, 180) },
    { room: "Tópico", qty: 2, line: configured("roller-blackout", 120, 140, { fabric: "Blanco" }) },
  ]);

  const p5 = await createProject({ clientId: clients[3].id, name: "Oficinas Yanahuara", status: "ganado", sector: "oficinas", district: "Yanahuara", address: "Calle Jerusalén 801, of. 302", days: 30 });
  await addRooms(p5.id, "Oficina 302", "Piso 3", [
    { room: "Planta libre", qty: 10, line: configured("doble-roller", 150, 170, { fabric: "Lino" }) },
    { room: "Sala de reuniones 1", qty: 3, line: configured("doble-roller", 150, 170, { fabric: "Lino", drive: "motor" }) },
    { room: "Sala de reuniones 2", qty: 3, line: configured("roller-blackout", 150, 170, { fabric: "Gris piedra" }) },
  ]);

  await createProject({
    clientId: clients[5].id, name: "Departamento en Sachaca", status: "enviado", kind: "particular", sector: "vivienda", district: "Sachaca", address: "Urb. Villa Sachaca D-14", days: 0,
    measurementRequest: { approxWindows: 6, address: "Urb. Villa Sachaca D-14", district: "Sachaca" },
  });

  const p7 = await createProject({ clientId: clients[6].id, name: "Primaria — reposición", status: "perdido", district: "Paucarpata", address: "Av. Kennedy 1450", days: 45 });
  await addRooms(p7.id, "Primaria", "Piso 1", Array.from({ length: 10 }, (_, i) => ({ room: `Aula ${i + 1}`, qty: 3, line: configured("roller-screen", 160, 150, { fabric: "Blanco gris" }) })));

  console.log("Listo: catálogo, 7 clientes, 8 proyectos (Pabellón A con plano y 50 ventanas).");
  console.log("Admin: demo@demo.com / demo1234 · Cliente: cliente@demo.com / demo1234");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
