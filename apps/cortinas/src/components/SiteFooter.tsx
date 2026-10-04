import Link from "next/link";
import { BRAND } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-14 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="font-serif text-3xl">Cota</p>
          <p className="mt-3 max-w-xs text-muted">{BRAND.line}. Medimos, fabricamos e instalamos desde {BRAND.city} para todo el sur del Perú.</p>
        </div>
        <div className="text-sm md:col-span-3">
          <p className="font-mono text-xs text-muted">Contacto</p>
          <p className="mt-2">{BRAND.phone}</p>
          <p>{BRAND.email}</p>
          <p className="mt-2 text-muted">{BRAND.address}</p>
        </div>
        <div className="text-sm md:col-span-2">
          <p className="font-mono text-xs text-muted">Explorar</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="link-grow" href="/catalogo">Catálogo</Link></li>
            <li><Link className="link-grow" href="/proyectos">Proyectos</Link></li>
            <li><Link className="link-grow" href="/particulares">Particulares</Link></li>
          </ul>
        </div>
        <div className="text-sm md:col-span-2">
          <p className="font-mono text-xs text-muted">Cuenta</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="link-grow" href="/cliente">Área de cliente</Link></li>
            <li><Link className="link-grow" href="/admin">Acceso interno</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1360px] flex-wrap justify-between gap-2 px-5 pb-8 text-xs text-muted md:px-10">
        <span>© {new Date().getFullYear()} Cota · Marca ficticia de demostración · Precios en soles con IGV</span>
        <span>Fotos: Unsplash y Pexels (ver CREDITS.md)</span>
      </div>
    </footer>
  );
}
