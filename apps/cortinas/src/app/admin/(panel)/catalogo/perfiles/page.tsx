import { redirect } from "next/navigation";

/** Telas y perfiles ahora son atributos. */
export default function Page() {
  redirect("/admin/catalogo/atributos");
}
