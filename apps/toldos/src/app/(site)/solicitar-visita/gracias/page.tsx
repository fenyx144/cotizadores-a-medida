import Link from "next/link";

export const metadata = { title: "Gracias — SunShade" };

export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-24 md:px-10">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="text-sm text-muted">Solicitud recibida{ref ? ` · ${ref}` : ""}</p>
          <h1 className="animate-rise mt-4 text-5xl leading-tight md:text-7xl">Gracias. Te llamamos pronto.</h1>
          <p className="mt-6 max-w-lg text-lg text-muted">Revisamos tu diseño y las fotos, y te llamamos en un día laborable para confirmar la visita. Te hemos enviado un correo con el resumen.</p>
          <div className="mt-10 flex gap-8">
            <Link href="/" className="link-grow">Volver al inicio</Link>
            <Link href="/muestrario" className="link-grow text-muted">Mientras tanto, mira las lonas</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
