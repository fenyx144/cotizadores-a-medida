/** Lecturas del catálogo para las páginas del panel (atributos con sus valores). */
import "server-only";
import { asc } from "drizzle-orm";
import { getDb, schema } from "./db";

export async function attributeData() {
  const db = getDb();
  const [attributes, values] = await Promise.all([
    db.select().from(schema.attributes).orderBy(asc(schema.attributes.id)),
    db.select().from(schema.attributeValues).orderBy(asc(schema.attributeValues.id)),
  ]);
  const attrOptions = attributes.map((a) => ({ id: a.id, name: a.name, defaultOn: a.scope !== "material", note: a.scope === "material" ? "según material" : "genérico", values: values.filter((v) => v.attributeId === a.id).map((v) => ({ id: v.id, name: v.name })) }));
  const valueOptions = attributes.flatMap((a) => values.filter((v) => v.attributeId === a.id).map((v) => ({ value: String(v.id), label: `${a.name} · ${v.name}${v.code && v.code !== v.name ? ` (${v.code})` : ""}` })));
  return { attributes: attributes.map((a) => ({ ...a, sortOrder: a.id })), values: values.map((v) => ({ ...v, sortOrder: v.id })), attrOptions, valueOptions };
}
