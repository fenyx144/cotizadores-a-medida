import { getCatalog } from "@/lib/catalog";
import { SwatchBook } from "@/components/SwatchBook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Muestrario de lonas — SunShade" };

export default async function MuestrarioPage() {
  const { fabrics } = await getCatalog();
  return (
    <div className="mx-auto max-w-[1320px] px-5 pt-14 md:px-10">
      <div className="mb-14 grid gap-4 md:grid-cols-12">
        <h1 className="text-5xl md:col-span-6 md:text-6xl">Muestrario de lonas</h1>
        <p className="self-end text-muted md:col-span-4 md:col-start-9">Colores que envejecen bien al sol. Toca una para verla puesta.</p>
      </div>
      <SwatchBook fabrics={fabrics} />
    </div>
  );
}
