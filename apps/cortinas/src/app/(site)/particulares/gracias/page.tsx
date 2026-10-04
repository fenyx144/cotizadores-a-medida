import Link from "next/link";

export const metadata = { title: "Solicitud recibida — Cota" };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-20 md:px-10">
      <p className="font-mono text-xs text-muted">Referencia {ref}</p>
      <h1 className="mt-4 max-w-2xl text-[3rem] leading-[1.02] md:text-[4rem]">Recibimos su solicitud.</h1>
      <p className="mt-5 max-w-md text-lg text-muted">Le escribiremos en un día hábil para confirmar medidas o coordinar la visita.</p>
      <Link href="/catalogo" className="link-grow mt-10 inline-block pb-0.5">Seguir viendo el catálogo</Link>
    </div>
  );
}
