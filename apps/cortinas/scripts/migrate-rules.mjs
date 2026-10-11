/**
 * Migra las reglas al constructor de frases (tras 0007_rule_builder.sql):
 * incompatibilidad "A → B" pasa a "si [atributo de A] es A: bloquear [atributo de B] B";
 * medidas con opción pasan a condición; recargos ligados a un valor pasan a reglas "Sumar recargo".
 * Uso: DATABASE_URL=... node scripts/migrate-rules.mjs (driver HTTP de Neon).
 */
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const q = (t, p) => sql.query(t, p);
const values = await q("select id, attribute_id from attribute_values");
const attrOf = (ref) => { const id = Number(String(ref).slice(2)); return { id, attributeId: values.find((v) => v.id === id)?.attribute_id }; };
for (const r of await q("select * from constraint_rules where kind in ('incompatibilidad','dimension')")) {
  const set = { conditions: [], target_attribute_id: null, target_value_ids: [], model_id: r.model_id };
  const cond = (ref) => { if (!ref) return; if (ref.startsWith("v:")) { const a = attrOf(ref); set.conditions.push({ attributeId: a.attributeId, valueIds: [a.id] }); } else if (ref.startsWith("producto:")) set.model_id = Number(ref.split(":")[1]); };
  cond(r.if_option);
  let kind = "medidas";
  if (r.kind === "incompatibilidad") { kind = "bloquear"; const t = attrOf(r.then_option); set.target_attribute_id = t.attributeId; set.target_value_ids = [t.id]; }
  await q("update constraint_rules set kind=$1, conditions=$2::jsonb, target_attribute_id=$3, target_value_ids=$4::jsonb, model_id=$5 where id=$6",
    [kind, JSON.stringify(set.conditions), set.target_attribute_id, JSON.stringify(set.target_value_ids), set.model_id, r.id]);
}
for (const p of await q("select * from price_rules where option_ref like 'v:%'")) {
  const a = attrOf(p.option_ref);
  await q("insert into constraint_rules (name, kind, conditions, surcharge, surcharge_kind, message, active) values ($1,'recargo',$2::jsonb,$3,$4,'',$5)",
    [p.name, JSON.stringify([{ attributeId: a.attributeId, valueIds: [a.id] }]), p.amount, p.kind === "por_m2" ? "por_m2" : "fijo", p.active]);
  await q("delete from price_rules where id=$1", [p.id]);
}
console.log(await q("select id, name, kind, family_id, model_id, conditions, target_attribute_id, target_value_ids, surcharge from constraint_rules order by id"));
