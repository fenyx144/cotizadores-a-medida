import { AdminShell } from "@portafolio/core/ui/AdminShell";
import { requireAdmin } from "@/lib/session";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel — SunShade" };

const NAV = [
  { href: "/admin", label: "Solicitudes", group: "Ventas" },
  { href: "/admin/calendario", label: "Calendario de visitas", group: "Ventas" },
  { href: "/admin/catalogo/modelos", label: "Modelos", group: "Catálogo" },
  { href: "/admin/catalogo/telas", label: "Lonas", group: "Catálogo" },
  { href: "/admin/catalogo/colores", label: "Colores de estructura", group: "Catálogo" },
  { href: "/admin/catalogo/precios", label: "Reglas de precio", group: "Catálogo" },
  { href: "/admin/catalogo/zonas", label: "Zonas de servicio", group: "Catálogo" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell brand="SunShade" items={NAV} userName={session.name} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
