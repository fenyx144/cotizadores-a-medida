/** Normaliza "Todos": listas de valores que ya incluyen todos los valores activos pasan a [] (incluye futuros); igual con los materiales de cada categoría. */
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL); const q = (t, p) => sql.query(t, p);
const vals = await q("select id, attribute_id from attribute_values where active");
const full = (attrId, ids) => { const all = vals.filter((v) => v.attribute_id === attrId).map((v) => v.id); return all.length > 0 && all.every((id) => ids.includes(id)); };
const norm = (list) => list.map((a) => (a.valueIds?.length && a.valueIds[0] !== -1 && full(a.attributeId, a.valueIds) ? { ...a, valueIds: [] } : a));
let n = 0;
for (const t of ["materials", "product_families"]) for (const r of await q(`select id, attributes from ${t}`)) {
  const next = norm(r.attributes); if (JSON.stringify(next) !== JSON.stringify(r.attributes)) { await q(`update ${t} set attributes=$1::jsonb where id=$2`, [JSON.stringify(next), r.id]); n++; }
}
const mats = (await q("select slug from materials")).map((m) => m.slug);
for (const f of await q("select id, materials from product_families")) { const s = f.materials.split(",").filter(Boolean); if (s.length && mats.every((m) => s.includes(m))) { await q("update product_families set materials='' where id=$1", [f.id]); n++; } }
console.log({ normalizados: n });
