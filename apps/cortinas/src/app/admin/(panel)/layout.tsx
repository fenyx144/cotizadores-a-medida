import { AdminShell } from "@portafolio/core/ui/AdminShell";
import { requireAdmin } from "@/lib/session";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel — Cota" };

const NAV = [
  { href: "/admin", label: "Proyectos", group: "Ventas" },
  { href: "/admin/catalogo/productos", label: "Productos", group: "Catálogo" },
  { href: "/admin/catalogo/telas", label: "Telas", group: "Catálogo" },
  { href: "/admin/catalogo/perfiles", label: "Perfiles", group: "Catálogo" },
  { href: "/admin/catalogo/reglas", label: "Reglas de precio", group: "Catálogo" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell brand="Cota" items={NAV} userName={session.name} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
