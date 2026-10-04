import { getCatalog } from "@/lib/catalog";
import { QuickQuote } from "@/components/QuickQuote";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cotización rápida — Cota" };

export default async function ParticularPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-10">
      <div className="grid gap-6 border-b border-line pb-8 md:grid-cols-12 md:items-end">
        <h1 className="text-[3rem] leading-none md:col-span-6 md:text-[4rem]">Para su casa</h1>
        <p className="text-muted md:col-span-5 md:col-start-8">Sin crear cuenta. Indique sus ventanas o pida que vayamos a medir.</p>
      </div>
      <div className="mt-10"><QuickQuote catalog={catalog} /></div>
    </div>
  );
}
