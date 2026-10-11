import { AdminShell } from "@portafolio/core/ui/AdminShell";
import { requireAdmin } from "@/lib/session";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel — Cota" };

const NAV = [
  { href: "/admin", label: "Proyectos", group: "Ventas" },
  { href: "/admin/guia", label: "Guía", group: "Catálogo" },
  { href: "/admin/catalogo/atributos", label: "1 Atributos", group: "Catálogo" },
  { href: "/admin/catalogo/familias", label: "2 Categorías", group: "Catálogo" },
  { href: "/admin/catalogo/productos", label: "3 Productos", group: "Catálogo" },
  { href: "/admin/catalogo/variantes", label: "4 Variantes", group: "Catálogo" },
  { href: "/admin/catalogo/reglas", label: "5 Reglas", group: "Catálogo" },
  { href: "/admin/catalogo/materiales", label: "Materiales", group: "Catálogo" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell brand="Cota" items={NAV} userName={session.name} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
