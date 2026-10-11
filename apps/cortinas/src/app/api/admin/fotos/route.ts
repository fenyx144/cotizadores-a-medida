/** Sube una foto de producto (solo admin) y devuelve su URL pública. */
import { makeKey } from "@portafolio/core/storage";
import { getSession } from "@/lib/session";
import { FileTooLargeError, putFile } from "@/lib/files";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ error: "Sesión expirada." }, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Elija una imagen." }, { status: 400 });
  if (!TYPES.includes(file.type)) return Response.json({ error: "Solo imágenes JPG, PNG o WEBP." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "La imagen supera 4 MB." }, { status: 400 });
  const key = makeKey("productos", file.name);
  try {
    await putFile(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (e) {
    if (e instanceof FileTooLargeError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
  return Response.json({ url: `/api/archivos/${key}` });
}
