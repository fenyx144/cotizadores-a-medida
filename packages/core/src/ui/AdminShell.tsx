"use client";
/**
 * Estructura del panel de administración: barra lateral + contenido.
 * Reutilizable: cada app le pasa su marca y su lista de enlaces.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface AdminNavItem {
  href: string;
  label: string;
  group?: string;
}

export function AdminShell({
  brand,
  items,
  userName,
  logoutAction,
  children,
}: {
  brand: string;
  items: AdminNavItem[];
  userName: string;
  logoutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const groups = Array.from(new Set(items.map((i) => i.group ?? "")));

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[230px_1fr]">
      <aside className="border-b border-line px-6 py-6 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <Link href="/admin" className="font-serif text-2xl">
          {brand}
        </Link>
        <p className="mt-1 text-xs text-muted">Panel interno</p>
        <nav className="mt-8 flex flex-wrap gap-x-4 gap-y-1 md:block md:space-y-6">
          {groups.map((group) => (
            <div key={group} className="contents md:block">
              {group && <p className="hidden text-xs text-muted md:mb-2 md:block">{group}</p>}
              <ul className="contents md:block md:space-y-1">
                {items
                  .filter((i) => (i.group ?? "") === group)
                  .map((item) => {
                    const active = item.href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/leads") : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block py-1 text-sm transition-colors ${active ? "text-ink underline decoration-terracotta underline-offset-4" : "text-muted hover:text-ink"}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
        <form action={logoutAction} className="mt-10 hidden text-sm text-muted md:block">
          <p>{userName}</p>
          <button className="mt-1 underline underline-offset-4 hover:text-ink">Cerrar sesión</button>
        </form>
      </aside>
      <main className="px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
