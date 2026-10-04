import Link from "next/link";
import { BRAND } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="font-serif text-3xl">SunShade</p>
          <p className="mt-3 max-w-xs text-muted">Toldos y pérgolas a medida. Medimos, fabricamos y montamos en {BRAND.city}.</p>
        </div>
        <div className="text-sm md:col-span-3">
          <p className="text-muted">Contacto</p>
          <p className="mt-2">{BRAND.phone}</p>
          <p>{BRAND.email}</p>
          <p className="mt-2 text-muted">Lunes a sábado, 9–18 h</p>
        </div>
        <div className="text-sm md:col-span-2">
          <p className="text-muted">Explorar</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="link-grow" href="/modelos">Modelos</Link></li>
            <li><Link className="link-grow" href="/configurador">Configurador</Link></li>
            <li><Link className="link-grow" href="/muestrario">Lonas</Link></li>
          </ul>
        </div>
        <div className="text-sm md:col-span-2">
          <p className="text-muted">Equipo</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="link-grow" href="/admin">Acceso interno</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1320px] justify-between px-5 pb-8 text-xs text-muted md:px-10">
        <span>© {new Date().getFullYear()} SunShade · Marca ficticia de demostración</span>
        <span>Fotos: Unsplash y Pexels</span>
      </div>
    </footer>
  );
}
