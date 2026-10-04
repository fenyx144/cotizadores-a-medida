import { getCatalog } from "@/lib/catalog";
import { OverlayStudio } from "@/components/OverlayStudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pruébalo en tu casa — SunShade" };

export default async function PruebaloPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-[1320px] px-5 pt-10 md:px-10 md:pt-14">
      <div className="mb-12 grid gap-4 md:grid-cols-12">
        <h1 className="text-5xl md:col-span-7 md:text-6xl">Pruébalo en tu casa</h1>
        <p className="self-end text-muted md:col-span-4 md:col-start-9">Así se vería tu toldo en tu propia fachada. Es una aproximación; en la visita lo afinamos.</p>
      </div>
      <OverlayStudio catalog={catalog} />
    </div>
  );
}
