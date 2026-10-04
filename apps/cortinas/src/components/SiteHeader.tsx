"use client";
/** Cabecera: marca en serif, navegación discreta y un único botón. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/proyectos", label: "Proyectos" },
  { href: "/particulares", label: "Particulares" },
  { href: "/cliente", label: "Área de cliente" },
];

export function SiteHeader({ clientName }: { clientName?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-3.5 md:px-10">
        <Link href="/" className="flex items-baseline gap-3" onClick={() => setOpen(false)}>
          <span className="font-serif text-[1.75rem] leading-none">Cota</span>
          <span className="hidden font-mono text-[0.7rem] text-muted sm:inline">cortinas · persianas · proyectos</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[0.92rem] lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`link-grow pb-0.5 ${pathname.startsWith(item.href) ? "text-ink" : "text-muted hover:text-ink"}`}>
              {item.label}
            </Link>
          ))}
          <Link href={clientName ? "/cliente" : "/cliente/registro"} className="ml-2 bg-blue px-4 py-2.5 text-white-stone transition-colors hover:bg-ink">
            {clientName ? "Mis proyectos" : "Cotizar por plano"}
          </Link>
        </nav>
        <button className="text-sm lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Cerrar" : "Menú"}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line px-5 pb-6 lg:hidden">
          {[...NAV, { href: "/cliente/registro", label: "Cotizar por plano" }].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-line py-3 font-serif text-xl">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
