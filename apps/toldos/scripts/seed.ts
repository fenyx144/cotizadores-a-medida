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
        minWidth: 200, maxWidth: 600, minProjection: 150, maxProjection: 350, basePrice: 690, pricePerM2: 85,
      },
      {
        slug: "cobijo", name: "Cobijo", type: "cofre", sortOrder: 2, image: "/img/modelo-cofre.webp",
        tagline: "Todo recogido en un cofre de líneas limpias.",
        description: "Al cerrarse, la lona y los brazos quedan dentro de un cofre de aluminio. Protegido de la lluvia y del polvo, dura años más.",
        minWidth: 250, maxWidth: 700, minProjection: 150, maxProjection: 400, basePrice: 1190, pricePerM2: 110,
      },
      {
        slug: "velo", name: "Velo", type: "vertical", sortOrder: 3, image: "/img/modelo-vertical.webp",
        tagline: "Sombra para el sol bajo de la tarde.",
        description: "Cae en vertical delante de ventanas, porches o el lateral de una pérgola. Tejido screen: filtra la luz y mantiene las vistas.",
        minWidth: 100, maxWidth: 450, minProjection: 120, maxProjection: 300, basePrice: 390, pricePerM2: 70,
      },
      {
        slug: "patio", name: "Patio", type: "pergola", sortOrder: 4, image: "/img/modelo-pergola.webp",
        tagline: "Una estancia más, al aire libre.",
        description: "Estructura autoportante con techo de lona tensada. Para jardines y terrazas grandes donde se come, se lee y se queda uno hasta tarde.",
        minWidth: 300, maxWidth: 700, minProjection: 250, maxProjection: 600, basePrice: 3900, pricePerM2: 210,
      },
    ])
    .returning();

  const fabrics = await db
    .insert(schema.fabrics)
    .values([
      { name: "Lino", code: "SL-101", collection: "Naturales", hex: "#E6DCC8", pattern: "liso", surchargePerM2: 0, sortOrder: 1 },
      { name: "Arena", code: "SL-104", collection: "Naturales", hex: "#D4BF9A", pattern: "liso", surchargePerM2: 0, sortOrder: 2 },
      { name: "Blanco roto", code: "SL-100", collection: "Naturales", hex: "#F1ECE2", pattern: "liso", surchargePerM2: 0, sortOrder: 3 },
      { name: "Terracota", code: "SL-210", collection: "Tierra", hex: "#B4552F", pattern: "liso", surchargePerM2: 4, sortOrder: 4 },
      { name: "Oliva", code: "SL-230", collection: "Tierra", hex: "#6B6B3C", pattern: "liso", surchargePerM2: 4, sortOrder: 5 },
      { name: "Grafito", code: "SL-300", collection: "Tierra", hex: "#3E3D3A", pattern: "liso", surchargePerM2: 4, sortOrder: 6 },
      { name: "Rayas Mediterráneo", code: "SR-410", collection: "Rayas", hex: "#F1ECE2", pattern: "rayas", stripeHex: "#B4552F", surchargePerM2: 9, sortOrder: 7 },
      { name: "Rayas Huerto", code: "SR-420", collection: "Rayas", hex: "#EDE6D6", pattern: "rayas", stripeHex: "#5E6236", surchargePerM2: 9, sortOrder: 8 },
      { name: "Rayas Puerto", code: "SR-430", collection: "Rayas", hex: "#EFEAE0", pattern: "rayas", stripeHex: "#2F3A4A", surchargePerM2: 9, sortOrder: 9 },
    ])
    .returning();

  const frames = await db
    .insert(schema.frameColors)
    .values([
      { name: "Blanco", ral: "RAL 9016", hex: "#F0EFEA", surcharge: 0, sortOrder: 1 },
      { name: "Crema", ral: "RAL 9001", hex: "#E7DDC8", surcharge: 0, sortOrder: 2 },
      { name: "Antracita", ral: "RAL 7016", hex: "#383E42", surcharge: 60, sortOrder: 3 },
      { name: "Bronce", ral: "RAL 8019", hex: "#463F3A", surcharge: 60, sortOrder: 4 },
      { name: "Negro forja", ral: "RAL 9005", hex: "#141414", surcharge: 90, sortOrder: 5 },
    ])
    .returning();

  await db.insert(schema.priceRules).values([
    { name: "Motor con mando a distancia", kind: "fijo", amount: 390, drive: "motor" },
    { name: "Motor + sensor viento y sol", kind: "fijo", amount: 620, drive: "sensor" },
    { name: "Montaje e instalación", kind: "fijo", amount: 180 },
    { name: "Refuerzo gran formato (más de 18 m²)", kind: "porcentaje", amount: 6, minArea: 18 },
    { name: "Cimentación de postes", kind: "fijo", amount: 260, modelType: "pergola" },
  ]);

  await db.insert(schema.serviceZones).values([
    { name: "Amsterdam", postalFrom: 1000, postalTo: 1109 },
    { name: "Haarlem y alrededores", postalFrom: 2000, postalTo: 2159 },
    { name: "Leiden", postalFrom: 2300, postalTo: 2353 },
    { name: "Utrecht", postalFrom: 3500, postalTo: 3585 },
    { name: "Amersfoort", postalFrom: 3800, postalTo: 3829 },
    { name: "Rotterdam", postalFrom: 3000, postalTo: 3089, active: false },
  ]);

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
    { name: "Marieke de Vries", email: "marieke@example.nl", phone: "+31 6 1234 5678", postalCode: "2011 AB", address: "Kruisweg 12", city: "Haarlem", zoneName: "Haarlem y alrededores", status: "nuevo", preferredDate: day(3), preferredSlot: "manana", message: "Terraza orientada al sur, nos da el sol toda la tarde.", configuration: cfg(1, 450, 300, 0, 2, "sensor"), estimatedPrice: 3480, createdAt: ago(0) },
    { name: "Café De Linde", email: "info@delinde.example", phone: "+31 30 555 0101", postalCode: "3511 CD", address: "Oudegracht 88", city: "Utrecht", zoneName: "Utrecht", status: "nuevo", preferredDate: day(5), preferredSlot: "tarde", message: "Dos toldos para la terraza del café, unos 10 m de fachada.", configuration: cfg(0, 500, 300, 6, 0, "motor"), estimatedPrice: 2760, createdAt: ago(1) },
    { name: "Joris Bakker", email: "joris@example.nl", phone: "+31 6 9876 5432", postalCode: "3811 EF", address: "Langestraat 5", city: "Amersfoort", zoneName: "Amersfoort", status: "en_revision", preferredDate: day(2), preferredSlot: "manana", visitAt: visit(2, 10), message: "Ático con mucho viento.", configuration: cfg(3, 400, 300, 5, 2, "motor"), estimatedPrice: 8420, createdAt: ago(3) },
    { name: "Sanne Visser", email: "sanne@example.nl", phone: "+31 6 2222 3333", postalCode: "1072 GH", address: "Van Woustraat 40", city: "Amsterdam", zoneName: "Amsterdam", status: "en_revision", preferredDate: day(6), preferredSlot: "tarde", visitAt: visit(6, 15), message: "", configuration: cfg(2, 240, 220, 1, 1, "manual"), estimatedPrice: 940, createdAt: ago(4) },
    { name: "Pieter Jansen", email: "pieter@example.nl", phone: "+31 6 4444 5555", postalCode: "2312 JK", address: "Breestraat 101", city: "Leiden", zoneName: "Leiden", status: "cotizado", preferredDate: day(-4), preferredSlot: "manana", message: "Queremos rayas, como las de antes.", configuration: cfg(0, 400, 250, 7, 0, "manual"), estimatedPrice: 1880, createdAt: ago(9) },
    { name: "Familie Mulder", email: "mulder@example.nl", phone: "+31 6 6666 7777", postalCode: "2023 LM", address: "Zijlweg 230", city: "Haarlem", zoneName: "Haarlem y alrededores", status: "ganado", preferredDate: day(-10), preferredSlot: "tarde", message: "", configuration: cfg(1, 550, 350, 3, 3, "sensor"), estimatedPrice: 4570, createdAt: ago(16) },
    { name: "Lotte Smit", email: "lotte@example.nl", phone: "+31 6 8888 9999", postalCode: "3521 NP", address: "Croeselaan 15", city: "Utrecht", zoneName: "Utrecht", status: "perdido", preferredDate: day(-14), preferredSlot: "manana", message: "Al final lo dejamos para el año que viene.", configuration: cfg(0, 300, 200, 2, 0, "manual"), estimatedPrice: 1420, createdAt: ago(21) },
  ];

  for (const lead of sample) {
    const [row] = await db.insert(schema.leads).values(lead).returning();
    await db.update(schema.leads).set({ reference: leadReference("SS", row.id) }).where(sql`id = ${row.id}`);
  }
  await db.insert(schema.leadNotes).values([
    { leadId: 3, body: "Llamado. Confirma visita; preguntar por anclaje en fachada de ladrillo.", author: "Equipo SunShade" },
    { leadId: 5, body: "Enviado presupuesto final: 1.940 € con instalación.", author: "Equipo SunShade" },
    { leadId: 6, body: "Firmado. Montaje previsto para la semana 42.", author: "Equipo SunShade" },
  ]);

  console.log(`✓ Seed listo: ${models.length} modelos, ${fabrics.length} lonas, ${frames.length} colores, ${sample.length} leads.`);
  console.log("  Admin: demo@demo.com / demo1234");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
