/**
 * Pasa "Solo para material" de cada valor al panel de atributos del material (tras 0008).
 * Los atributos con valores restringidos quedan "según material"; cada material activa esos
 * atributos con los valores que antes le correspondían. Uso: DATABASE_URL=... node scripts/migrate-material-attributes.mjs
 */
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL); const q = (t, p) => sql.query(t, p);
const values = await q("select id, attribute_id, only_for from attribute_values");
const restricted = [...new Set(values.filter((v) => v.only_for).map((v) => v.attribute_id))];
for (const id of restricted) await q("update attributes set scope='material' where id=$1", [id]);
for (const m of await q("select id, slug from materials")) {
  const attrs = restricted.map((attributeId) => {
    const vs = values.filter((v) => v.attribute_id === attributeId);
    const ok = vs.filter((v) => !v.only_for || v.only_for.split(",").map((s) => s.trim()).includes(m.slug)).map((v) => v.id);
    return ok.length ? { attributeId, required: false, valueIds: ok.length === vs.length ? [] : ok } : null;
  }).filter(Boolean);
  await q("update materials set attributes=$1::jsonb where id=$2", [JSON.stringify(attrs), m.id]);
}
await q("update attribute_values set only_for=''");
console.log(await q("select slug, attributes from materials order by id"));
