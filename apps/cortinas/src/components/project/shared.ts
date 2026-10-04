/** Tipos y utilidades compartidas por las pestañas del editor de proyecto. */
import type { ActionResult } from "@/app/actions/project";
import type { ProjectData } from "@/lib/project";
import type { CatalogData } from "@/lib/line-price";

export type { ProjectData, CatalogData, ActionResult };
export type Line = ProjectData["lines"][number];
export type Location = ProjectData["locations"][number];
export type Plan = ProjectData["plans"][number];

export interface EditorContext {
  data: ProjectData;
  catalog: CatalogData;
  readOnly: boolean;
  busy: boolean;
  /** Ejecuta una acción del servidor y actualiza el estado con el resultado. */
  act: (p: Promise<ActionResult>, okMessage?: string) => Promise<Extract<ActionResult, { ok: true }> | null>;
}

export function locName(l?: { building: string; floor: string; room: string } | null) {
  return l ? [l.building, l.floor, l.room].filter(Boolean).join(" · ") : "Sin ubicación";
}

export const inputCls = "w-full border-b border-line bg-transparent py-1.5 text-[0.95rem] outline-none focus:border-ink disabled:text-muted";
export const labelCls = "block font-mono text-[11px] text-muted";
export const btnPrimary = "bg-blue px-4 py-2 text-sm text-white-stone transition-colors hover:bg-ink disabled:opacity-50";
export const btnLine = "border border-line px-3 py-1.5 text-sm transition-colors hover:border-ink disabled:opacity-50";
