import { getCatalog, getZones } from "@/lib/catalog";
import { QuoteForm } from "@/components/QuoteForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solicitar visita — SunShade" };

export default async function SolicitarVisitaPage() {
  const [catalog, zones] = await Promise.all([getCatalog(), getZones()]);
  return (
    <div className="mx-auto max-w-[1320px] px-5 pt-10 md:px-10 md:pt-14">
      <div className="mb-14 grid gap-4 md:grid-cols-12">
        <h1 className="text-5xl md:col-span-7 md:text-6xl">Solicitar visita</h1>
        <p className="self-end text-muted md:col-span-4 md:col-start-9">Vamos a tu casa, medimos y te dejamos un presupuesto cerrado. Gratis y sin compromiso.</p>
      </div>
      <QuoteForm catalog={catalog} zones={zones.filter((z) => z.active).map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
