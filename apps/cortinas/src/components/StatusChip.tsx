import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@portafolio/core/projects";

/** Colores de estado: Recibido azul, En proceso ámbar, Presupuestado violeta, Aceptado verde, Descartado/Borrador gris. */
export const STATUS_CHIP: Record<string, string> = {
  borrador: "bg-[#F1F0EC] text-[#5B6068] ring-[#E4E1DA]",
  enviado: "bg-[#EAF1FD] text-[#1D4ED8] ring-[#C9DAFB]",
  en_revision: "bg-[#FEF4E2] text-[#A15C07] ring-[#F8DCA8]",
  cotizado: "bg-[#F3EEFD] text-[#6D3FD0] ring-[#DDD0FA]",
  ganado: "bg-[#E7F4EE] text-[#1F6B4F] ring-[#BFE0D0]",
  perdido: "bg-[#F1F0EC] text-[#80858C] ring-[#E4E1DA]",
};

export function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CHIP[status] ?? STATUS_CHIP.borrador} ${className}`} data-testid="status-chip">
      <span className="size-1.5 rounded-full bg-current" />{PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status}
    </span>
  );
}
