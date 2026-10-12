"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ask, notify } from "@portafolio/core/ui/Dialog";
import { deleteOwnProject } from "@/app/actions/project";

export function DeleteProjectButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className="text-sm text-muted hover:text-danger" aria-label={`Eliminar ${name}`} data-testid="delete-project"
      onClick={async () => {
        if (!(await ask({ title: `¿Eliminar “${name}”?`, text: "Se borran sus ventanas, planos y archivos. No se puede deshacer.", ok: "Eliminar", danger: true }))) return;
        setBusy(true);
        const r = await deleteOwnProject(id);
        setBusy(false);
        if (!r.ok) return notify("No se pudo eliminar", r.error);
        router.refresh();
      }}>
      Eliminar
    </button>
  );
}
