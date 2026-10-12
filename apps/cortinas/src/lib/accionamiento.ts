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
  schemaP ??= getDb().execute(sql`alter table product_models add column if not exists attributes jsonb not null default '[]'::jsonb`).then(() => undefined)
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
