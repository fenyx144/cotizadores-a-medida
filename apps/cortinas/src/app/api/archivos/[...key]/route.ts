/** Fotos públicas del catálogo subidas desde el panel. */
import { getFile } from "@/lib/files";

export async function GET(req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const key = (await ctx.params).key.join("/");
  if (!/^productos\/[\w-]+\.(jpe?g|png|webp)$/i.test(key)) return new Response("No encontrado", { status: 404 });
  const file = await getFile(key, new URL(req.url).origin);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(Buffer.from(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
