import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Acceso interno — Cota" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden md:block">
        <Image src="/img/proyecto-instituto.webp" alt="" fill className="object-cover" sizes="50vw" priority />
      </div>
      <div className="flex items-center px-6 py-16 md:px-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="font-serif text-3xl">Cota</Link>
          <h1 className="mt-10 text-4xl">Panel interno</h1>
          <p className="mt-2 text-muted">Proyectos, observaciones y catálogo.</p>
          <div className="mt-10"><LoginForm /></div>
          <div className="mt-10 border-t border-line pt-4 text-sm text-muted">
            <p>Acceso de demostración</p>
            <p className="mt-1 text-ink">demo@demo.com · demo1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
