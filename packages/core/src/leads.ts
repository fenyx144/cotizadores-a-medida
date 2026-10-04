/** Estados del tablero de solicitudes (leads) y sus etiquetas. */
export const LEAD_STATUSES = ["nuevo", "en_revision", "cotizado", "ganado", "perdido"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  cotizado: "Cotizado",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const SLOT_LABELS: Record<string, string> = { manana: "Mañana (9–13 h)", tarde: "Tarde (14–18 h)" };

/** Genera una referencia legible: SS-2026-0042 */
export function leadReference(prefix: string, id: number, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(id).padStart(4, "0")}`;
}
