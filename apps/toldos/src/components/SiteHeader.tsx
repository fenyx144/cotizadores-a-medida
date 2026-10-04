"use client";
/** Cabecera: logotipo en serif, navegación discreta y un único botón. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/modelos", label: "Modelos" },
  { href: "/configurador", label: "Configurador" },
  { href: "/pruebalo", label: "Pruébalo en casa" },
  { href: "/muestrario", label: "Lonas" },
  { href: "/asistente", label: "¿Cuál elijo?" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-4 md:px-10">
        <Link href="/" className="font-serif text-[1.65rem] leading-none" onClick={() => setOpen(false)}>
          SunShade
        </Link>
        <nav className="hidden items-center gap-7 text-[0.94rem] lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`link-grow pb-0.5 ${pathname.startsWith(item.href) ? "text-ink" : "text-muted hover:text-ink"}`}>
              {item.label}
            </Link>
          ))}
          <Link href="/solicitar-visita" className="ml-2 bg-ink px-4 py-2.5 text-paper transition-colors hover:bg-terracotta">
            Pedir visita
          </Link>
        </nav>
        <button className="text-sm lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Cerrar" : "Menú"}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line px-5 pb-6 lg:hidden">
          {[...NAV, { href: "/solicitar-visita", label: "Pedir visita" }].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-line/70 py-3 font-serif text-xl">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
