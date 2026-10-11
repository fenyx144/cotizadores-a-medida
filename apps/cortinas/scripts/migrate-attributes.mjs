/**
 * Migración de datos al modelo de atributos (una sola vez, tras 0006_attributes.sql):
 * telas, colores de perfil y accionamientos pasan a ser valores de atributo; se actualizan
 * categorías, reglas, recargos, variantes y la config de las líneas existentes.
 * Uso: node scripts/migrate-attributes.mjs (con DATABASE_URL; usa el driver HTTP de Neon).
 */
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const q = (t, p) => sql.query(t, p);

if ((await q("select count(*)::int n from attributes"))[0].n) { console.log("Ya migrado."); process.exit(0); }

const ATTRS = [[1, "Tela", "color"], [2, "Color del perfil", "color"], [3, "Accionamiento", "lista"], [4, "Lado del mando", "lista"], [5, "Caída", "lista"], [6, "Cenefa decorativa", "sino"]];
for (const [id, name, kind] of ATTRS) await q("insert into attributes (id,name,kind,sort_order) values ($1,$2,$3,$1)", [id, name, kind]);

const fabrics = await q("select * from fabrics order by id");
const frames = await q("select * from frame_colors order by id");
const V = []; // [id, attr, name, code, hex, surcharge, kind, onlyFor, active, sort]
for (const f of fabrics) V.push([f.id, 1, f.name, f.code, f.hex, f.surcharge_per_m2, "por_m2", f.types, f.active, f.sort_order]);
const FR = (id) => 12 + id; // perfiles: 13..15
for (const f of frames) V.push([FR(f.id), 2, f.name, f.ral ? `RAL ${f.ral}` : "", f.hex, f.surcharge, "fijo", "", f.active, f.sort_order]);
const DR = { manual: 16, motor: 17, sensor: 18 };
V.push([16, 3, "Cadena", "manual", "", 0, "fijo", "", true, 1], [17, 3, "Motor con mando", "motor", "", 380, "fijo", "", true, 2], [18, 3, "Motor + control centralizado", "sensor", "", 520, "fijo", "", true, 3]);
V.push([19, 4, "Izquierda", "IZQ", "", 0, "fijo", "", true, 1], [20, 4, "Derecha", "DER", "", 0, "fijo", "", true, 2]);
V.push([21, 5, "Normal", "", "", 0, "fijo", "", true, 1], [22, 5, "Invertida", "", "", 0, "fijo", "", true, 2]);
V.push([23, 6, "Sí", "", "", 45, "fijo", "", true, 1]);
for (const v of V) await q("insert into attribute_values (id,attribute_id,name,code,hex,surcharge,surcharge_kind,only_for,active,sort_order) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", v);
for (const t of ["attributes", "attribute_values"]) await q(`select setval(pg_get_serial_sequence('${t}','id'), (select max(id) from ${t}))`);

// Categorías: atributos que piden (antes: requiere tela/perfil/accionamiento + listas permitidas).
const ids = (s) => (s ? s.split(",").filter(Boolean) : []);
const families = await q("select * from product_families order by id");
const famAttrs = {};
for (const f of families) {
  const a = [{ attributeId: 1, required: f.requires_fabric, valueIds: ids(f.allowed_fabric_ids).map(Number) }];
  if (f.requires_frame) a.push({ attributeId: 2, required: true, valueIds: ids(f.allowed_frame_ids).map((x) => FR(Number(x))) });
  a.push({ attributeId: 3, required: f.requires_drive, valueIds: ids(f.allowed_drives).map((d) => DR[d]) });
  a.push({ attributeId: 4, required: false, valueIds: [] });
  if ([1, 3].includes(f.id)) a.push({ attributeId: 5, required: false, valueIds: [] });
  if ([1, 2].includes(f.id)) a.push({ attributeId: 6, required: false, valueIds: [] });
  famAttrs[f.id] = a;
  await q("update product_families set attributes = $1::jsonb where id = $2", [JSON.stringify(a), f.id]);
}

// Referencias "tela:6" / "perfil:3" / "accionamiento:motor" -> "v:<id>".
const ref = (r) => {
  if (!r) return r;
  const [t, v] = r.split(":");
  if (t === "tela") return `v:${v}`;
  if (t === "perfil") return `v:${FR(Number(v))}`;
  if (t === "accionamiento") return `v:${DR[v]}`;
  return r;
};
for (const c of await q("select id, if_option, then_option from constraint_rules")) await q("update constraint_rules set if_option=$1, then_option=$2 where id=$3", [ref(c.if_option), ref(c.then_option), c.id]);
for (const r of await q("select id, option_ref, drive from price_rules")) {
  if (r.drive) await q("delete from price_rules where id=$1", [r.id]); // el recargo pasa al valor del accionamiento
  else if (r.option_ref) await q("update price_rules set option_ref=$1 where id=$2", [ref(r.option_ref), r.id]);
}
for (const v of await q("select id, fabric_id, frame_color_id from product_variants")) await q("update product_variants set value_ids=$1 where id=$2", [[v.fabric_id, v.frame_color_id && FR(v.frame_color_id)].filter(Boolean).join(","), v.id]);

// Líneas: config con valores por atributo y opciones con nombres.
const models = await q("select id, family_id from product_models");
const vals = new Map(V.map((v) => [v[0], v]));
const names = Object.fromEntries(ATTRS.map(([id, n]) => [id, n]));
let n = 0;
for (const l of await q("select id, config from lines where config is not null")) {
  const c = l.config;
  if (c.values) continue;
  const fam = famAttrs[models.find((m) => m.id === c.modelId)?.family_id] ?? [];
  const has = (a) => !fam.length || fam.some((x) => x.attributeId === a);
  const values = {};
  if (c.fabricId && has(1)) values[1] = c.fabricId;
  if (c.frameColorId && has(2)) values[2] = FR(c.frameColorId);
  if (c.drive && has(3)) values[3] = DR[c.drive];
  const options = Object.entries(values).map(([a, id]) => { const v = vals.get(id); return { attributeId: Number(a), attribute: names[a], valueId: id, value: v[2], ...(v[3] ? { code: v[3] } : {}), ...(v[4] ? { hex: v[4] } : {}) }; });
  const next = { modelId: c.modelId, modelName: c.modelName, modelType: c.modelType, values, options, variantId: c.variantId ?? null, variantCode: c.variantCode ?? null, variantName: c.variantName ?? null };
  await q("update lines set config=$1::jsonb where id=$2", [JSON.stringify(next), l.id]);
  n++;
}
console.log("Líneas migradas:", n);
