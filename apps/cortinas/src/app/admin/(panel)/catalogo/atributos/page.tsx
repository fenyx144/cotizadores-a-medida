import { CrudManager } from "@portafolio/core/ui/CrudManager";
import { ATTRIBUTE_FIELDS } from "@/lib/admin-fields";
import { attributeData } from "@/lib/admin-catalog";

export default async function Page() {
  const { attributes, values } = await attributeData();
  // Cada atributo con sus valores, que se editan dentro del mismo formulario.
  const rows = attributes.map((a) => ({ ...a, values: values.filter((v) => v.attributeId === a.id).map((v) => ({ id: v.id, name: v.name, hex: v.hex, image: v.image })) }));
  return (
    <CrudManager resource="attributes" title="1 · Atributos" newLabel="Añadir atributo" fields={ATTRIBUTE_FIELDS} initialRows={rows} />
  );
}
