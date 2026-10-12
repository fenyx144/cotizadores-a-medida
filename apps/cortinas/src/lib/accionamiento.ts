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
// (La limpieza de la demo se retiró: no se borran datos del catálogo.)

/**
 * Deshace la limpieza de la demo si llegó a ejecutarse: reinserta con sus ids originales lo borrado
 * y repone las referencias (permisos de Accionamiento en categorías y Blackout en productos/categorías).
 */
let restoreP: Promise<void> | null = null;
export const restoreInfo: { restored?: boolean; error?: string } = {};
export function ensureDemoRestore() {
  restoreP ??= (async () => {
    const db = getDb();
    await db.execute(sql`create table if not exists cota_migrations (name text primary key, at timestamptz not null default now(), data jsonb)`);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771126)`);
      const r = await tx.execute(sql`select data from cota_migrations where name = 'limpieza-demo'`);
      const rows = ((r as unknown as { rows?: { data: unknown }[] }).rows ?? (r as unknown as { data: unknown }[]));
      if (!rows.length) return;
      type Snap = {
        attribute: (typeof schema.attributes.$inferSelect & { values: (typeof schema.attributeValues.$inferSelect)[] }) | null;
        material: typeof schema.materials.$inferSelect | null; family: typeof schema.productFamilies.$inferSelect | null;
        models: (typeof schema.productModels.$inferSelect)[]; variants: (typeof schema.productVariants.$inferSelect)[];
        rules: (typeof schema.constraintRules.$inferSelect)[];
        blackoutProducts: { id: number; materials: string; material: string }[];
      };
      const s = rows[0].data as Snap;
      const S = schema;
      if (s.attribute) {
        const { values, ...a } = s.attribute;
        await tx.insert(S.attributes).values(a).onConflictDoNothing();
        if (values.length) await tx.insert(S.attributeValues).values(values).onConflictDoNothing();
      }
      if (s.material) await tx.insert(S.materials).values(s.material).onConflictDoNothing();
      if (s.family) await tx.insert(S.productFamilies).values(s.family).onConflictDoNothing();
      for (const m of s.models) await tx.insert(S.productModels).values({ ...m }).onConflictDoNothing();
      for (const v of s.variants) await tx.insert(S.productVariants).values(v).onConflictDoNothing();
      for (const ru of s.rules) await tx.insert(S.constraintRules).values(ru).onConflictDoNothing();
      for (const p of s.blackoutProducts) await tx.update(S.productModels).set({ materials: p.materials, material: p.material }).where(sql`id = ${p.id}`);
      // Permisos de Accionamiento por categoría (como los creó la migración original: requerido, valores de sus productos).
      if (s.attribute) {
        const byCode = new Map(s.attribute.values.map((v) => [v.code, v.id]));
        const models = await tx.select().from(S.productModels);
        for (const f of await tx.select().from(S.productFamilies)) {
          const list = f.attributes ?? [];
          if (!list.length || list.some((e) => e.attributeId === s.attribute!.id)) continue;
          const ids = [...new Set(models.filter((m) => m.familyId === f.id).map((m) => byCode.get(m.type)!).filter(Boolean))];
          await tx.update(S.productFamilies).set({ attributes: [{ attributeId: s.attribute.id, required: true, valueIds: ids }, ...list] }).where(sql`id = ${f.id}`);
        }
      }
      // Blackout de vuelta en las categorías de sus productos (si la categoría limita materiales).
      if (s.material) {
        const slug = s.material.slug;
        const models = await tx.select().from(S.productModels);
        for (const f of await tx.select().from(S.productFamilies)) {
          const uses = models.some((m) => m.familyId === f.id && (m.materials || m.material).split(",").includes(slug));
          const list = f.materials.split(",").filter(Boolean);
          if (uses && list.length && !list.includes(slug)) await tx.update(S.productFamilies).set({ materials: [...list, slug].join(",") }).where(sql`id = ${f.id}`);
        }
      }
      await tx.execute(sql`insert into cota_migrations (name, data) values ('restaurar-demo', ${JSON.stringify(s)}::jsonb) on conflict (name) do nothing`);
      await tx.execute(sql`delete from cota_migrations where name = 'limpieza-demo'`);
      restoreInfo.restored = true;
    });
    cleanupInfo.done = false;
  })().catch((e) => { restoreP = null; restoreInfo.error = String(e); fail("restaurar-demo", e); });
  return restoreP;
}

/**
 * Permisos de categoría por (material, atributo): los "según material" guardados una sola vez se copian
 * a cada material de la categoría que activa el atributo (no destructivo: mismos valores y obligatoriedad).
 */
let permsP: Promise<void> | null = null;
export function ensureMaterialPerms() {
  permsP ??= (async () => {
    const db = getDb();
    const scoped = new Set((await db.select().from(schema.attributes)).filter((a) => a.scope === "material").map((a) => a.id));
    const mats = await db.select().from(schema.materials);
    const fams = await db.select().from(schema.productFamilies);
    const todo = fams.filter((f) => (f.attributes ?? []).some((e) => scoped.has(e.attributeId) && !e.material));
    if (!todo.length) return;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771127)`);
      for (const f0 of todo) {
        const [f] = await tx.select().from(schema.productFamilies).where(sql`id = ${f0.id}`);
        if (!f) continue;
        const famMats = f.materials.split(",").filter(Boolean);
        const pool = mats.filter((m) => !famMats.length || famMats.includes(m.slug));
        const next: typeof f.attributes = [];
        for (const e of f.attributes ?? []) {
          if (!scoped.has(e.attributeId) || e.material) { next.push(e); continue; }
          const on = pool.filter((m) => (m.attributes ?? []).some((x) => x.attributeId === e.attributeId && x.valueIds[0] !== -1));
          if (!on.length) { next.push(e); continue; }
          for (const m of on) if (!next.some((x) => x.attributeId === e.attributeId && x.material === m.slug)) next.push({ ...e, material: m.slug });
        }
        await tx.update(schema.productFamilies).set({ attributes: next }).where(sql`id = ${f.id}`);
      }
    });
  })().catch((e) => { permsP = null; fail("permisos-material", e); });
  return permsP;
}

/**
 * Los valores ya no se eligen en la categoría sino en el producto. Una sola vez (marca en cota_migrations):
 * copia a cada producto los valores que permitía su categoría (genéricos y por material), intersectando con lo
 * que el producto ya acotaba, para que el configurador ofrezca lo mismo que antes. No borra nada de la categoría.
 */
let prodPermsP: Promise<void> | null = null;
export function ensureProductPerms() {
  prodPermsP ??= (async () => {
    const db = getDb();
    await db.execute(sql`create table if not exists cota_migrations (name text primary key, at timestamptz not null default now(), data jsonb)`);
    const rowsOf = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? (r as unknown[]));
    if (rowsOf(await db.execute(sql`select 1 from cota_migrations where name = 'permisos-producto'`)).length) return;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771128)`);
      if (rowsOf(await tx.execute(sql`select 1 from cota_migrations where name = 'permisos-producto'`)).length) return;
      const fams = await tx.select().from(schema.productFamilies);
      const models = await tx.select().from(schema.productModels);
      const inter = (a: number[], b: number[]) => { const x = a.filter((v) => b.includes(v)); return x.length ? x : a; };
      const before: Record<number, unknown> = {};
      for (const p of models) {
        const f = fams.find((x) => x.id === p.familyId);
        if (!f?.attributes?.length) continue;
        const slugs = (p.materials || p.material).split(",").filter(Boolean);
        const list: NonNullable<typeof p.attributes> = JSON.parse(JSON.stringify(p.attributes ?? []));
        let changed = false;
        for (const e of f.attributes) {
          if (!e.valueIds.length || e.valueIds[0] === -1) continue;
          const g = list.find((x) => x.attributeId === e.attributeId && !x.material);
          if (e.material) {
            if (!slugs.includes(e.material) || list.some((x) => x.attributeId === e.attributeId && x.material === e.material)) continue;
            if (g?.valueIds[0] === -1) continue;
            list.push({ attributeId: e.attributeId, required: false, valueIds: g?.valueIds.length ? inter(e.valueIds, g.valueIds) : e.valueIds, material: e.material });
            changed = true;
          } else if (!g) { list.push({ attributeId: e.attributeId, required: false, valueIds: e.valueIds }); changed = true; }
          else if (g.valueIds[0] !== -1) {
            const v = g.valueIds.length ? inter(e.valueIds, g.valueIds) : e.valueIds;
            if (v.join() !== g.valueIds.join()) { g.valueIds = v; changed = true; }
          }
        }
        if (changed) { before[p.id] = p.attributes; await tx.update(schema.productModels).set({ attributes: list }).where(sql`id = ${p.id}`); }
      }
      await tx.execute(sql`insert into cota_migrations (name, data) values ('permisos-producto', ${JSON.stringify(before)}::jsonb)`);
    });
  })().catch((e) => { prodPermsP = null; fail("permisos-producto", e); });
  return prodPermsP;
}

/**
 * Medidas solo en el producto. Una vez (marca en cota_migrations): cada producto toma lo que antes resultaba de
 * combinar sus medidas con las de su categoría (sin medida propia, las de la categoría). Guarda las anteriores.
 */
let sizesP: Promise<void> | null = null;
export function ensureProductSizes() {
  sizesP ??= (async () => {
    const db = getDb();
    await db.execute(sql`create table if not exists cota_migrations (name text primary key, at timestamptz not null default now(), data jsonb)`);
    const rowsOf = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? (r as unknown[]));
    if (rowsOf(await db.execute(sql`select 1 from cota_migrations where name = 'medidas-producto'`)).length) return;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(771129)`);
      if (rowsOf(await tx.execute(sql`select 1 from cota_migrations where name = 'medidas-producto'`)).length) return;
      const fams = await tx.select().from(schema.productFamilies);
      const before: Record<number, number[]> = {};
      for (const p of await tx.select().from(schema.productModels)) {
        const f = fams.find((x) => x.id === p.familyId);
        if (!f) continue;
        const lo = (own: number, cat: number) => (own ? Math.max(own, cat || 0) : cat);
        const hi = (own: number, cat: number) => (own ? (cat ? Math.min(own, cat) : own) : cat);
        const next = { minWidth: lo(p.minWidth, f.minWidth), maxWidth: hi(p.maxWidth, f.maxWidth), minProjection: lo(p.minProjection, f.minHeight), maxProjection: hi(p.maxProjection, f.maxHeight) };
        if (next.minWidth > next.maxWidth || next.minProjection > next.maxProjection) continue; // sin solape: se deja como estaba
        if (next.minWidth === p.minWidth && next.maxWidth === p.maxWidth && next.minProjection === p.minProjection && next.maxProjection === p.maxProjection) continue;
        before[p.id] = [p.minWidth, p.maxWidth, p.minProjection, p.maxProjection];
        await tx.update(schema.productModels).set(next).where(sql`id = ${p.id}`);
      }
      await tx.execute(sql`insert into cota_migrations (name, data) values ('medidas-producto', ${JSON.stringify(before)}::jsonb)`);
    });
  })().catch((e) => { sizesP = null; fail("medidas-producto", e); });
  return sizesP;
}
