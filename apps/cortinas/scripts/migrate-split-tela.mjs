/**
 * Divide "Tela" en "Tipo de tela" (lista, según material) y "Color de tela" (el atributo 1, con sus muestras).
 * Los ids de color se conservan, así que reglas, variantes, recargos y líneas siguen valiendo; se añade:
 * el atributo de tipo con sus valores, permisos por material y categoría, reglas "permitir solo" tipo → colores,
 * el tipo en las variantes y en las líneas guardadas. Uso: DATABASE_URL=... node scripts/migrate-split-tela.mjs
 */
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL); const q = (t, p) => sql.query(t, p);
if ((await q("select 1 from attributes where name='Tipo de tela'")).length) { console.log("ya migrado"); process.exit(0); }
const TYPES = [
  { name: "Screen 5%", code: "SC5", materials: ["screen", "mixto"] },
  { name: "Screen 3%", code: "SC3", materials: ["screen", "mixto"] },
  { name: "Blackout", code: "BK", materials: ["blackout"] },
  { name: "PVC", code: "VP", materials: ["pvc"] },
  { name: "Lámina aluminio", code: "AL", materials: ["aluminio"] },
];
const colors = await q("select id, code, name from attribute_values where attribute_id=1");
await q("update attributes set name='Color de tela', kind='lista' where id=1");
const [attr] = await q("insert into attributes (name, kind, scope, unit, sort_order) values ('Tipo de tela','lista','material','',0) returning id");
const T = attr.id; const typeOf = {};
for (const [i, t] of TYPES.entries()) {
  const [v] = await q("insert into attribute_values (attribute_id, name, code, sort_order) values ($1,$2,$3,$4) returning id", [T, t.name, t.code, i + 1]);
  t.id = v.id; t.colors = colors.filter((c) => c.code.startsWith(t.code + "-")).map((c) => c.id);
  for (const c of t.colors) typeOf[c] = t;
  await q("insert into constraint_rules (name, kind, conditions, target_attribute_id, target_value_ids, message, active) values ($1,'permitir',$2::jsonb,1,$3::jsonb,$4,true)",
    [`Colores de ${t.name}`, JSON.stringify([{ attributeId: T, valueIds: [t.id] }]), JSON.stringify(t.colors), `Colores de ${t.name}: ${colors.filter((c) => t.colors.includes(c.id)).map((c) => c.name).join(", ")}.`]);
}
for (const m of await q("select id, slug, attributes from materials")) {
  const ids = TYPES.filter((t) => t.materials.includes(m.slug)).map((t) => t.id);
  if (ids.length) await q("update materials set attributes=$1::jsonb where id=$2", [JSON.stringify([...m.attributes, { attributeId: T, required: false, valueIds: ids }]), m.id]);
}
for (const f of await q("select id, attributes from product_families")) {
  if (!f.attributes.some((a) => a.attributeId === 1)) continue;
  const tela = f.attributes.find((a) => a.attributeId === 1);
  await q("update product_families set attributes=$1::jsonb where id=$2", [JSON.stringify([{ attributeId: T, required: tela.required, valueIds: [] }, ...f.attributes]), f.id]);
}
for (const v of await q("select id, value_ids from product_variants")) {
  const ids = v.value_ids.split(",").filter(Boolean).map(Number); const t = ids.map((i) => typeOf[i]).find(Boolean);
  if (t) await q("update product_variants set value_ids=$1 where id=$2", [[t.id, ...ids].join(","), v.id]);
}
let n = 0;
for (const l of await q("select id, config from lines where config is not null")) {
  const cfg = l.config; const color = cfg.values?.["1"]; const t = typeOf[color]; if (!t) continue;
  cfg.values = { [T]: t.id, ...cfg.values };
  cfg.options = [{ attributeId: T, attribute: "Tipo de tela", value: t.name, valueId: t.id, code: t.code }, ...(cfg.options ?? []).map((o) => (o.attributeId === 1 ? { ...o, attribute: "Color de tela" } : o))];
  await q("update lines set config=$1::jsonb where id=$2", [JSON.stringify(cfg), l.id]); n++;
}
console.log({ tipo: T, tipos: TYPES.map((t) => [t.name, t.colors]), lineas: n });
