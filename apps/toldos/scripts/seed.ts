/**
 * Datos de demostración. Uso: pnpm db:seed
 * Borra y vuelve a crear catálogo, zonas, leads de ejemplo y el admin demo.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@portafolio/core/db/client";
import { hashPassword } from "@portafolio/core/auth";
import { leadReference } from "@portafolio/core/leads";
import type { LeadConfiguration } from "@portafolio/core/db/schema";
import { calculatePrice, type PricingRule } from "@portafolio/core/pricing";

async function main() {
  const db = getDb();
  console.log("Limpiando tablas…");
  await db.execute(sql`TRUNCATE lead_notes, lead_photos, leads, price_rules, service_zones, frame_colors, fabrics, product_models, admin_users RESTART IDENTITY CASCADE`);

  const models = await db
    .insert(schema.productModels)
    .values([
      {
        slug: "brisa", name: "Brisa", type: "retractil", sortOrder: 1, image: "/img/modelo-retractil.webp",
        tagline: "El clásico de brazos, ligero y luminoso.",
        description: "Brazos articulados de aluminio y lona acrílica tintada en masa. Se recoge contra la fachada y desaparece cuando no lo necesitas.",
        minWidth: 200, maxWidth: 600, minProjection: 150, maxProjection: 350, basePrice: 460, pricePerM2: 28,
      },
      {
        slug: "cobijo", name: "Cobijo", type: "cofre", sortOrder: 2, image: "/img/modelo-cofre.webp",
        tagline: "Todo recogido en un cofre de líneas limpias.",
        description: "Al cerrarse, la lona y los brazos quedan dentro de un cofre de aluminio. Protegido de la lluvia y del polvo, dura años más.",
        minWidth: 250, maxWidth: 700, minProjection: 150, maxProjection: 400, basePrice: 560, pricePerM2: 30,
      },
      {
        slug: "velo", name: "Velo", type: "vertical", sortOrder: 3, image: "/img/modelo-vertical.webp",
        tagline: "Sombra para el sol bajo de la tarde.",
        description: "Cae en vertical delante de ventanas, porches o el lateral de una pérgola. Tejido screen: filtra la luz y mantiene las vistas.",
        minWidth: 100, maxWidth: 450, minProjection: 120, maxProjection: 300, basePrice: 300, pricePerM2: 32,
      },
      {
        slug: "patio", name: "Patio", type: "pergola", sortOrder: 4, image: "/img/modelo-pergola.webp",
        tagline: "Una estancia más, al aire libre.",
        description: "Estructura autoportante con techo de lona tensada. Para jardines y terrazas grandes donde se come, se lee y se queda uno hasta tarde.",
        minWidth: 300, maxWidth: 700, minProjection: 250, maxProjection: 600, basePrice: 1150, pricePerM2: 48,
      },
      {
        slug: "portal", name: "Portal", type: "retractil", sortOrder: 5, image: "/img/cafe-toldo.webp",
        tagline: "Un toldo pequeño para la entrada o una ventana.",
        description: "Protege la puerta de entrada, una ventana o un mostrador. Brazos cortos, montaje en una mañana.",
        minWidth: 100, maxWidth: 250, minProjection: 60, maxProjection: 150, basePrice: 300, pricePerM2: 25,
      },
    ])
    .returning();

  const fabrics = await db
    .insert(schema.fabrics)
    .values([
      { name: "Lino", code: "SL-101", collection: "Naturales", hex: "#E6DCC8", pattern: "liso", surchargePerM2: 0, sortOrder: 1 },
      { name: "Arena", code: "SL-104", collection: "Naturales", hex: "#D4BF9A", pattern: "liso", surchargePerM2: 0, sortOrder: 2 },
      { name: "Blanco roto", code: "SL-100", collection: "Naturales", hex: "#F1ECE2", pattern: "liso", surchargePerM2: 0, sortOrder: 3 },
      { name: "Terracota", code: "SL-210", collection: "Tierra", hex: "#B4552F", pattern: "liso", surchargePerM2: 3, sortOrder: 4 },
      { name: "Oliva", code: "SL-230", collection: "Tierra", hex: "#6B6B3C", pattern: "liso", surchargePerM2: 3, sortOrder: 5 },
      { name: "Grafito", code: "SL-300", collection: "Tierra", hex: "#3E3D3A", pattern: "liso", surchargePerM2: 3, sortOrder: 6 },
      { name: "Rayas Mediterráneo", code: "SR-410", collection: "Rayas", hex: "#F1ECE2", pattern: "rayas", stripeHex: "#B4552F", surchargePerM2: 6, sortOrder: 7 },
      { name: "Rayas Huerto", code: "SR-420", collection: "Rayas", hex: "#EDE6D6", pattern: "rayas", stripeHex: "#5E6236", surchargePerM2: 6, sortOrder: 8 },
      { name: "Rayas Puerto", code: "SR-430", collection: "Rayas", hex: "#EFEAE0", pattern: "rayas", stripeHex: "#2F3A4A", surchargePerM2: 6, sortOrder: 9 },
    ])
    .returning();

  const frames = await db
    .insert(schema.frameColors)
    .values([
      { name: "Blanco", ral: "RAL 9016", hex: "#F0EFEA", surcharge: 0, sortOrder: 1 },
      { name: "Crema", ral: "RAL 9001", hex: "#E7DDC8", surcharge: 0, sortOrder: 2 },
      { name: "Antracita", ral: "RAL 7016", hex: "#383E42", surcharge: 40, sortOrder: 3 },
      { name: "Bronce", ral: "RAL 8019", hex: "#463F3A", surcharge: 40, sortOrder: 4 },
      { name: "Negro forja", ral: "RAL 9005", hex: "#141414", surcharge: 60, sortOrder: 5 },
    ])
    .returning();

  const rules = await db.insert(schema.priceRules).values([
    { name: "Motor con mando a distancia", kind: "fijo", amount: 320, drive: "motor" },
    { name: "Motor + sensor viento y sol", kind: "fijo", amount: 480, drive: "sensor" },
    { name: "Montaje e instalación", kind: "fijo", amount: 60 },
    { name: "Refuerzo gran formato (más de 18 m²)", kind: "porcentaje", amount: 5, minArea: 18 },
    { name: "Anclaje de postes", kind: "fijo", amount: 150, modelType: "pergola" },
  ]).returning();

  // Zonas de servicio: distritos de Arequipa donde hacemos visitas.
  await db.insert(schema.serviceZones).values(
    ["Arequipa (Cercado)", "Cayma", "Yanahuara", "Cerro Colorado", "Sachaca", "José Luis Bustamante y Rivero", "Paucarpata", "Miraflores", "Alto Selva Alegre", "Socabaya"].map(
      (name, i) => ({ name, city: "Arequipa", sortOrder: i, active: name !== "Socabaya" }),
    ),
  );

  await db.insert(schema.adminUsers).values({ email: "demo@demo.com", name: "Equipo SunShade", passwordHash: await hashPassword("demo1234") });

  // --- Leads de ejemplo ---
  const cfg = (mi: number, w: number, p: number, fi: number, ci: number, drive: LeadConfiguration["drive"]): LeadConfiguration => {
    const m = models[mi], f = fabrics[fi], c = frames[ci];
    return {
      modelId: m.id, modelName: m.name, modelType: m.type, width: w, projection: p,
      fabricId: f.id, fabricName: f.name, fabricHex: f.hex, fabricPattern: f.pattern, fabricStripeHex: f.stripeHex,
      frameColorId: c.id, frameColorName: c.name, frameHex: c.hex, drive,
    };
  };
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const ago = (days: number) => new Date(Date.now() - days * 86400000);
  const visit = (offset: number, hour: number) => {
    const d = new Date(day(offset) + "T00:00:00");
    d.setHours(hour);
    return d;
  };

  const sample = [
    { name: "Lucía Paredes", email: "lucia@ejemplo.pe", phone: "+51 900 000 394", district: "Cayma", address: "Dirección de demostración 1, Cayma", zoneName: "Cayma", status: "nuevo", preferredDate: day(3), preferredSlot: "manana", message: "La terraza da al norte, nos pega el sol toda la tarde.", configuration: cfg(1, 450, 300, 0, 2, "sensor"), estimatedPrice: 1600, createdAt: ago(0) },
    { name: "Café La Terraza (ficticio)", email: "cafe@ejemplo.pe", phone: "+51 900 000 010", district: "Yanahuara", address: "Dirección de demostración 2, Yanahuara", zoneName: "Yanahuara", status: "nuevo", preferredDate: day(5), preferredSlot: "tarde", message: "Dos toldos para la terraza del café, unos 10 m de fachada.", configuration: cfg(0, 500, 300, 6, 0, "motor"), estimatedPrice: 1350, createdAt: ago(1) },
    { name: "Jorge Valdivia", email: "jorge@ejemplo.pe", phone: "+51 900 000 647", district: "Cerro Colorado", address: "Dirección de demostración 3, Cerro Colorado", zoneName: "Cerro Colorado", status: "en_revision", preferredDate: day(2), preferredSlot: "manana", visitAt: visit(2, 10), message: "Azotea con bastante viento por la tarde.", configuration: cfg(3, 400, 300, 5, 2, "motor"), estimatedPrice: 2290, createdAt: ago(3) },
    { name: "Rosa Huamán", email: "rosa@ejemplo.pe", phone: "+51 900 000 749", district: "José Luis Bustamante y Rivero", address: "Dirección de demostración 4, José Luis Bustamante y Rivero", zoneName: "José Luis Bustamante y Rivero", status: "en_revision", preferredDate: day(6), preferredSlot: "tarde", visitAt: visit(6, 15), message: "Es para la puerta de la tienda.", configuration: cfg(4, 200, 100, 3, 1, "manual"), estimatedPrice: 420, createdAt: ago(4) },
    { name: "Carlos Zegarra", email: "carlos@ejemplo.pe", phone: "+51 900 000 491", district: "Sachaca", address: "Dirección de demostración 5, Sachaca", zoneName: "Sachaca", status: "cotizado", preferredDate: day(-4), preferredSlot: "manana", message: "Queremos rayas, como las de antes.", configuration: cfg(0, 400, 250, 7, 0, "manual"), estimatedPrice: 860, createdAt: ago(9) },
    { name: "Familia Delgado", email: "delgado@ejemplo.pe", phone: "+51 900 000 503", district: "Yanahuara", address: "Dirección de demostración 6, Yanahuara", zoneName: "Yanahuara", status: "ganado", preferredDate: day(-10), preferredSlot: "tarde", message: "", configuration: cfg(1, 550, 350, 3, 3, "sensor"), estimatedPrice: 1820, createdAt: ago(16) },
    { name: "Patricia Linares", email: "patricia@ejemplo.pe", phone: "+51 900 000 168", district: "Paucarpata", address: "Dirección de demostración 7, Paucarpata", zoneName: "Paucarpata", status: "perdido", preferredDate: day(-14), preferredSlot: "manana", message: "Al final lo dejamos para el próximo año.", configuration: cfg(2, 240, 220, 2, 0, "manual"), estimatedPrice: 530, createdAt: ago(21) },
  ];

  for (const lead of sample) {
    // El precio orientativo se calcula con el mismo motor que usa la web.
    const c = lead.configuration;
    lead.estimatedPrice = calculatePrice(c, {
      model: models.find((m) => m.id === c.modelId)!,
      fabric: fabrics.find((f) => f.id === c.fabricId),
      frameColor: frames.find((f) => f.id === c.frameColorId),
      rules: rules as PricingRule[],
    }).total;
    const [row] = await db.insert(schema.leads).values(lead).returning();
    await db.update(schema.leads).set({ reference: leadReference("SS", row.id) }).where(sql`id = ${row.id}`);
  }
  await db.insert(schema.leadNotes).values([
    { leadId: 3, body: "Llamado. Confirma visita; revisar anclaje en muro de sillar.", author: "Equipo SunShade" },
    { leadId: 5, body: "Enviado presupuesto final: S/ 890 con instalación.", author: "Equipo SunShade" },
    { leadId: 6, body: "Firmado. Montaje previsto para el jueves 22.", author: "Equipo SunShade" },
  ]);

  console.log(`✓ Seed listo: ${models.length} modelos, ${fabrics.length} lonas, ${frames.length} colores, ${sample.length} leads.`);
  console.log("  Admin: demo@demo.com / demo1234");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
