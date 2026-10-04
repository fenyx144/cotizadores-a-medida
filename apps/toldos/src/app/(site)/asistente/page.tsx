import { getCatalog } from "@/lib/catalog";
import { Wizard } from "@/components/Wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "¿Cuál elijo? — SunShade" };

export default async function AsistentePage() {
  const { models } = await getCatalog();
  return (
    <div className="mx-auto max-w-[1320px] px-5 pt-14 md:px-10">
      <p className="text-sm text-muted">¿No sabes por dónde empezar?</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Tres preguntas y te orientamos</h1>
      <div className="mt-16 border-t border-line pt-12">
        <Wizard models={models.map(({ slug, name, type, image }) => ({ slug, name, type, image }))} />
      </div>
    </div>
  );
}
