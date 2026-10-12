/**
 * "Accionamiento" (enrollable, día y noche, vertical, veneciana) es un atributo genérico normal.
 * Antes era el campo especial "Mecanismo" (product_models.type, que se conserva).
 * Migración idempotente y no destructiva: crea el atributo y sus valores, renombra el antiguo
 * "Accionamiento" (cadena / motor) a "Mando" y habilita en cada categoría solo el valor de sus productos.
 */
import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { TYPE_LABELS } from "./content";

/** Últimos errores de las migraciones automáticas (para /api/salud). */
export const upgradeErrors: string[] = [];
const fail = (k: string, e: unknown) => { upgradeErrors.push(`${k}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300)); console.error(k, e); };

let done: Promise<void> | null = null;

export function ensureAccionamiento() {
  done ??= migrate().catch((e) => { done = null; fail("accionamiento", e); });
  return done;
}

async function migrate() {
  const db = getDb();
  if (await demoCleanedUp()) return; // tras la limpieza de la demo no se recrea
  const codes = Object.keys(TYPE_LABELS);
  const has = async (tx: typeof db) => (await tx.select({ id: schema.attributeValues.id }).from(schema.attributeValues).where(sql`${schema.attributeValues.code} = 'enrollable'`)).length > 0;
  if (await has(db)) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(771122)`);
    if (await has(tx as unknown as typeof db)) return;
    await tx.update(schema.attributes).set({ name: "Mando" }).where(sql`${schema.attributes.name} = 'Accionamiento'`);
    await tx.execute(sql`update attributes set sort_order = sort_order + 1`);
    const [attr] = await tx.insert(schema.attributes).values({ name: "Accionamiento", kind: "lista", scope: "generico", sortOrder: 0 }).returning();
    const vals = await tx.insert(schema.attributeValues).values(codes.map((c, i) => ({ attributeId: attr.id, name: TYPE_LABELS[c], code: c, sortOrder: i + 1 }))).returning();
    const byCode = new Map(vals.map((v) => [v.code, v.id]));
    const models = await tx.select().from(schema.productModels);
    for (const f of await tx.select().from(schema.productFamilies)) {
      const ids = [...new Set(models.filter((m) => m.familyId === f.id).map((m) => byCode.get(m.type)!).filter(Boolean))];
      const list = f.attributes ?? [];
      if (!list.length) continue; // sin lista = todos los atributos (ya lo incluye)
      await tx.update(schema.productFamilies).set({ attributes: [{ attributeId: attr.id, required: true, valueIds: ids }, ...list] }).where(sql`${schema.productFamilies.id} = ${f.id}`);
    }
  });
}


/**
 * Demo de producto con varios materiales a la vez: crea "Tubo de aluminio" (pide Color del perfil)
 * y lo añade a Roller Screen (Screen + Tubo de aluminio). Solo si aún no hay ningún producto combinado.
 */
let combo: Promise<void> | null = null;
export function ensureCombinedDemo() {
  combo ??= (async () => {
    const db = getDb();
    const models = await db.select().from(schema.productModels);
    if (models.some((m) => m.materials.includes(","))) return;
    if (await demoCleanedUp()) return;
    const [exists] = await db.select().from(schema.materials).where(sql`${schema.materials.slug} = 'tubo-aluminio'`);
    if (exists) return;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771123)`);
      const [again] = await tx.select().from(schema.materials).where(sql`${schema.materials.slug} = 'tubo-aluminio'`);
      if (again) return;
      await tx.execute(sql`select setval(pg_get_serial_sequence('materials', 'id'), (select coalesce(max(id), 1) from materials))`);
      const [perfil] = await tx.select().from(schema.attributes).where(sql`${schema.attributes.name} = 'Color del perfil'`);
      await tx.insert(schema.materials).values({ slug: "tubo-aluminio", name: "Tubo de aluminio", description: "Tubo y perfiles de aluminio lacado.", sortOrder: 9,
        attributes: perfil ? [{ attributeId: perfil.id, required: false, valueIds: [] }] : [] });
      const rs = models.find((m) => m.slug === "roller-screen");
      if (!rs) return;
      await tx.update(schema.productModels).set({ materials: `${rs.materials || rs.material},tubo-aluminio` }).where(sql`${schema.productModels.id} = ${rs.id}`);
      if (rs.familyId) await tx.execute(sql`update product_families set materials = materials || ',tubo-aluminio' where id = ${rs.familyId} and materials <> '' and position('tubo-aluminio' in materials) = 0`);
    });
  })().catch((e) => { combo = null; fail("combinado", e); });
  return combo;
}

/** Orden visible desde 1: renumera 1..n (mismo orden) donde haya posiciones 0 o negativas. */
let order: Promise<void> | null = null;
export function ensureOrderFromOne() {
  order ??= (async () => {
    const db = getDb();
    const groups: [string, string | null][] = [["attributes", null], ["attribute_values", "attribute_id"], ["materials", null], ["product_families", null], ["product_models", null], ["product_variants", "model_id"]];
    for (const [t, by] of groups) {
      const part = by ? `partition by ${by} ` : "";
      const where = by ? `where ${by} in (select ${by} from ${t} where sort_order < 1)` : `where exists (select 1 from ${t} where sort_order < 1)`;
      await db.execute(sql.raw(`update ${t} x set sort_order = n.rn from (select id, row_number() over (${part}order by sort_order, id) as rn from ${t} ${where}) n where x.id = n.id`));
    }
  })().catch((e) => { order = null; fail("orden", e); });
  return order;
}

/** Nombres visibles de materiales (solo si siguen con el nombre antiguo; el código no cambia). */
let names: Promise<void> | null = null;
export function ensureMaterialNames() {
  names ??= (async () => {
    const db = getDb();
    await db.execute(sql`update materials set name = 'Tela día y noche' where slug = 'mixto' and name ilike 'mixto%'`);
    await db.execute(sql`update materials set name = 'Lámina de aluminio' where slug = 'aluminio' and trim(name) ilike 'aluminio'`);
  })().catch((e) => { names = null; fail("nombres", e); });
  return names;
}

/** Columna nueva (no destructiva): atributos acotados por producto. Debe ir antes de cualquier lectura de productos. */
let schemaP: Promise<void> | null = null;
export function ensureSchema() {
  schemaP ??= (async () => {
    const db = getDb();
    await db.execute(sql`alter table product_models add column if not exists attributes jsonb not null default '[]'::jsonb`);
    await db.execute(sql`alter table materials add column if not exists price real not null default 0`);
    await db.execute(sql`alter table materials add column if not exists price_unit text not null default 'm2'`);
  })()
    .catch((e) => { schemaP = null; fail("esquema", e); });
  return schemaP;
}

/**
 * Los materiales solo llevan atributos propios del material (tipo/color de tela, color del perfil…).
 * "Color del perfil" pasa a "según material": cada material que no lo desactivaba lo admite con todos sus valores (mismo resultado).
 * Los atributos funcionales (genéricos: mando, lado, accionamiento…) se quitan de los materiales.
 */
let scopes: Promise<void> | null = null;
export function ensureMaterialScopes() {
  scopes ??= (async () => {
    const db = getDb();
    const [perfil] = await db.select().from(schema.attributes).where(sql`${schema.attributes.name} = 'Color del perfil' and ${schema.attributes.scope} = 'generico'`);
    if (!perfil) return;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771124)`);
      const [again] = await tx.select().from(schema.attributes).where(sql`${schema.attributes.id} = ${perfil.id} and ${schema.attributes.scope} = 'generico'`);
      if (!again) return;
      const generic = new Set((await tx.select().from(schema.attributes)).filter((a) => a.scope !== "material" && a.id !== perfil.id).map((a) => a.id));
      for (const m of await tx.select().from(schema.materials)) {
        let list = (m.attributes ?? []).filter((e) => !generic.has(e.attributeId));
        if (!list.some((e) => e.attributeId === perfil.id)) list = [...list, { attributeId: perfil.id, required: false, valueIds: [] }];
        await tx.update(schema.materials).set({ attributes: list }).where(sql`${schema.materials.id} = ${m.id}`);
      }
      await tx.update(schema.attributes).set({ scope: "material" }).where(sql`${schema.attributes.id} = ${perfil.id}`);
    });
  })().catch((e) => { scopes = null; fail("ámbitos", e); });
  return scopes;
}

/**
 * Precio por material (una vez, si ningún material tiene precio): se deriva de los precios actuales de producto
 * para que el cliente vea importes parecidos. Por m²: precio/m² del producto + precio base repartido en 2,25 m².
 * Tubo de aluminio: por metro lineal.
 */
let prices: Promise<void> | null = null;
export function ensureMaterialPrices() {
  prices ??= (async () => {
    const db = getDb();
    const mats = await db.select().from(schema.materials);
    if (!mats.length || mats.some((m) => m.price > 0)) return;
    const models = await db.select().from(schema.productModels);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771125)`);
      const again = await tx.select().from(schema.materials);
      if (again.some((m) => m.price > 0)) return;
      for (const m of again) {
        if (m.slug === "tubo-aluminio") { await tx.update(schema.materials).set({ price: 12, priceUnit: "ml" }).where(sql`${schema.materials.id} = ${m.id}`); continue; }
        const own = models.filter((p) => (p.materials || p.material).split(",").includes(m.slug));
        const base = own;
        const price = base.length ? Math.round(base.reduce((n, p) => n + p.pricePerM2 + p.basePrice / 2.25, 0) / base.length) : 0;
        await tx.update(schema.materials).set({ price, priceUnit: "m2" }).where(sql`${schema.materials.id} = ${m.id}`);
      }
    });
  })().catch((e) => { prices = null; fail("precios", e); });
  return prices;
}

/**
 * Limpieza para la demo en vivo (una sola vez, con marca en cota_migrations): borra Accionamiento (4 valores),
 * el material Blackout, la categoría del Doble roller, el producto Persiana de aluminio 25 mm y la regla
 * "Lámina aluminio → Plata/Blanco/Grafito", quitando sus referencias. Guarda una copia de lo borrado.
 */
export const cleanupInfo: { done?: boolean; summary?: unknown } = {};
let cleanupP: Promise<void> | null = null;
export async function demoCleanedUp(): Promise<boolean> {
  const db = getDb();
  await db.execute(sql`create table if not exists cota_migrations (name text primary key, at timestamptz not null default now(), data jsonb)`);
  const r = await db.execute(sql`select data from cota_migrations where name = 'limpieza-demo'`);
  const rows = (r as unknown as { rows?: { data: unknown }[] }).rows ?? (r as unknown as { data: unknown }[]);
  if (rows.length) { cleanupInfo.done = true; cleanupInfo.summary = rows[0].data; }
  return rows.length > 0;
}
export function ensureDemoCleanup() {
  cleanupP ??= (async () => {
    if (await demoCleanedUp()) return;
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771126)`);
      const r = await tx.execute(sql`select 1 from cota_migrations where name = 'limpieza-demo'`);
      if (((r as unknown as { rows?: unknown[] }).rows ?? (r as unknown as unknown[])).length) return;
      const S = schema;
      const attrs = await tx.select().from(S.attributes);
      const vals = await tx.select().from(S.attributeValues);
      const mats = await tx.select().from(S.materials);
      const fams = await tx.select().from(S.productFamilies);
      const models = await tx.select().from(S.productModels);
      const variants = await tx.select().from(S.productVariants);
      const rules = await tx.select().from(S.constraintRules);
      const n = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const valsOf = (a: number) => vals.filter((v) => v.attributeId === a);

      const acc = attrs.find((a) => n(a.name) === "accionamiento" && valsOf(a.id).length === 4);
      const accVals = acc ? valsOf(acc.id).map((v) => v.id) : [];
      const blackout = mats.find((m) => m.slug === "blackout" || n(m.name) === "blackout");
      const dnModels = models.filter((m) => (m.materials || m.material).split(",").includes("mixto"));
      const fam = fams.find((f) => n(f.name).startsWith("doble roller")) ?? fams.find((f) => dnModels.some((m) => m.familyId === f.id));
      const persiana = models.find((m) => n(m.name).startsWith("persiana de aluminio 25"));
      const famModels = fam ? models.filter((m) => m.familyId === fam.id) : [];
      const delModels = [...famModels, ...(persiana && !famModels.includes(persiana) ? [persiana] : [])];
      const delModelIds = new Set(delModels.map((m) => m.id));
      const tipo = attrs.find((a) => n(a.name) === "tipo de tela");
      const lamina = vals.find((v) => v.attributeId === tipo?.id && n(v.name).startsWith("lamina"));
      const colorTela = attrs.find((a) => n(a.name) === "color de tela");
      const lamRule = rules.find((r) => (n(r.name).includes("lamina aluminio") && n(r.name).includes("plata")) ||
        (lamina && colorTela && r.targetAttributeId === colorTela.id && (r.conditions ?? []).some((c) => (c.valueIds ?? []).includes(lamina.id)) && !r.familyId && !r.modelId));

      const delRules = rules.filter((r) =>
        r === lamRule ||
        (acc && (r.targetAttributeId === acc.id || (r.conditions ?? []).some((c) => c.attributeId === acc.id))) ||
        (blackout && (r.conditions ?? []).some((c) => (c.materials ?? []).includes(blackout.slug))) ||
        (r.modelId != null && delModelIds.has(r.modelId)) || (fam && r.familyId === fam.id));
      const delVariants = variants.filter((v) => delModelIds.has(v.modelId));
      const snapshot = {
        attribute: acc ? { ...acc, values: valsOf(acc.id) } : null,
        material: blackout ?? null,
        family: fam ?? null,
        models: delModels, variants: delVariants, rules: delRules,
        blackoutProducts: blackout ? models.filter((m) => !delModelIds.has(m.id) && (m.materials || m.material).split(",").includes(blackout.slug)).map((m) => ({ id: m.id, name: m.name, materials: m.materials, material: m.material })) : [],
      };

      const strip = (list: { attributeId: number }[] | null) => (list ?? []).filter((e) => e.attributeId !== acc?.id);
      if (acc) {
        for (const f of fams) await tx.update(S.productFamilies).set({ attributes: strip(f.attributes) as typeof f.attributes }).where(sql`id = ${f.id}`);
        for (const m of mats) await tx.update(S.materials).set({ attributes: strip(m.attributes) as typeof m.attributes }).where(sql`id = ${m.id}`);
        for (const m of models) await tx.update(S.productModels).set({ attributes: strip(m.attributes) as typeof m.attributes }).where(sql`id = ${m.id}`);
        for (const v of variants) {
          const ids = v.valueIds.split(",").filter((x) => x && !accVals.includes(Number(x)));
          if (ids.join(",") !== v.valueIds) await tx.update(S.productVariants).set({ valueIds: ids.join(",") }).where(sql`id = ${v.id}`);
        }
        await tx.delete(S.attributeValues).where(sql`attribute_id = ${acc.id}`);
        await tx.delete(S.attributes).where(sql`id = ${acc.id}`);
      }
      for (const r of delRules) await tx.delete(S.constraintRules).where(sql`id = ${r.id}`);
      for (const v of delVariants) await tx.delete(S.productVariants).where(sql`id = ${v.id}`);
      for (const m of delModels) await tx.delete(S.productModels).where(sql`id = ${m.id}`);
      if (fam) await tx.delete(S.productFamilies).where(sql`id = ${fam.id}`);
      if (blackout) {
        const drop = (list: string) => list.split(",").filter((x) => x && x !== blackout.slug).join(",");
        for (const f of fams) if (f.id !== fam?.id && f.materials.split(",").includes(blackout.slug)) await tx.update(S.productFamilies).set({ materials: drop(f.materials) }).where(sql`id = ${f.id}`);
        for (const m of models) {
          if (delModelIds.has(m.id)) continue;
          const list = (m.materials || m.material).split(",");
          if (!list.includes(blackout.slug)) continue;
          const rest = drop(m.materials || m.material);
          await tx.update(S.productModels).set({ materials: rest, material: rest.split(",")[0] ?? "" }).where(sql`id = ${m.id}`);
        }
        await tx.execute(sql`update product_variants set material = '' where material = ${blackout.slug}`);
        await tx.delete(S.materials).where(sql`id = ${blackout.id}`);
      }
      await tx.execute(sql`insert into cota_migrations (name, data) values ('limpieza-demo', ${JSON.stringify(snapshot)}::jsonb)`);
    });
    await demoCleanedUp();
  })().catch((e) => { cleanupP = null; fail("limpieza-demo", e); });
  return cleanupP;
}
