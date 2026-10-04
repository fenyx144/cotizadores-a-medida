import Link from "next/link";
import { DemoAccessCard, RegisterForm } from "@/components/forms/ClientForms";

export const metadata = { title: "Crear cuenta — Cota" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto grid max-w-[1360px] gap-12 px-5 pt-14 md:grid-cols-12 md:px-10">
      <div className="md:col-span-4">
        <p className="font-mono text-xs text-muted">Para instituciones y empresas</p>
        <h1 className="mt-4 text-[3rem] leading-none">Crear cuenta</h1>
        <p className="mt-4 text-muted">Con su RUC emitimos la cotización a nombre de la institución. Puede guardar el proyecto y volver cuando quiera.</p>
        <p className="mt-8 text-sm text-muted">¿Ya tiene cuenta? <Link href="/cliente/ingresar" className="text-ink underline decoration-accent underline-offset-4">Ingrese</Link></p>
        <div className="mt-8"><p className="mb-3 text-sm text-muted">¿Solo quiere ver la demo? No hace falta registrarse.</p><DemoAccessCard next={next} /></div>
      </div>
      <div className="md:col-span-7 md:col-start-6"><RegisterForm next={next} /></div>
    </div>
  );
}
