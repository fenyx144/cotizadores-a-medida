import { AdminShell } from "@portafolio/core/ui/AdminShell";
import { requireAdmin } from "@/lib/session";
import { ensureOrderFromOne } from "@/lib/accionamiento";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel — Cota" };

const NAV = [
  { href: "/admin", label: "Proyectos", group: "Ventas" },
  { href: "/admin/guia", label: "Guía", group: "Catálogo" },
  { href: "/admin/catalogo/atributos", label: "1 Atributos", group: "Catálogo" },
  { href: "/admin/catalogo/materiales", label: "2 Materiales", group: "Catálogo" },
  { href: "/admin/catalogo/familias", label: "3 Categorías", group: "Catálogo" },
  { href: "/admin/catalogo/productos", label: "4 Productos", group: "Catálogo" },
  { href: "/admin/catalogo/variantes", label: "5 Variantes", group: "Catálogo" },
  { href: "/admin/catalogo/reglas", label: "6 Reglas", group: "Catálogo" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  await ensureOrderFromOne();
  return (
    <AdminShell brand="Cota" items={NAV} userName={session.name} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
