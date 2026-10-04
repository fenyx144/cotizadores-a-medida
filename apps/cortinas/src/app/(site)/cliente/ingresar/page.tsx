import Link from "next/link";
import { ClientLoginForm, DemoAccessCard } from "@/components/forms/ClientForms";

export const metadata = { title: "Ingresar — Cota" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto grid max-w-[1360px] gap-12 px-5 pt-14 md:grid-cols-12 md:px-10">
      <div className="md:col-span-5">
        <p className="font-mono text-xs text-muted">Área de cliente</p>
        <h1 className="mt-4 text-[3rem] leading-none">Ingresar</h1>
        <p className="mt-4 max-w-sm text-muted">Sus proyectos guardados, en borrador o enviados, con su estado.</p>
        <div className="mt-10 max-w-sm"><ClientLoginForm next={next} /></div>
        <p className="mt-8 text-sm text-muted">¿Primera vez? <Link href={`/cliente/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-ink underline decoration-accent underline-offset-4">Cree una cuenta</Link></p>
      </div>
      <div className="md:col-span-4 md:col-start-9"><DemoAccessCard next={next} /></div>
    </div>
  );
}
