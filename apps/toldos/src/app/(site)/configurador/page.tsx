import { getCatalog } from "@/lib/catalog";
import { Configurator } from "@/components/Configurator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurador — SunShade" };

export default async function ConfiguradorPage({ searchParams }: { searchParams: Promise<{ modelo?: string; lona?: string }> }) {
  const [catalog, params] = await Promise.all([getCatalog(), searchParams]);
  return (
    <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-10 md:px-10 md:pt-14">
      <div className="mb-12 grid gap-4 md:grid-cols-12">
        <h1 className="text-5xl md:col-span-7 md:text-6xl">Diseña tu toldo</h1>
        <p className="self-end text-muted md:col-span-4 md:col-start-9">Cambia lo que quieras: el dibujo y el precio se actualizan al momento.</p>
      </div>
      <Configurator catalog={catalog} params={params} />
    </div>
  );
}
