/**
 * Lógica pura de proyectos (app de cortinas): estados, descuentos por volumen,
 * totales del resumen y sugerencia de medidas desde el plano calibrado.
 * No toca base de datos ni React: se testea en test/projects.test.ts.
 */

export const PROJECT_STATUSES = ["borrador", "enviado", "en_revision", "cotizado", "ganado", "perdido"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  en_revision: "En revisión",
  cotizado: "Cotizado",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const LINE_STATUSES = ["sin_configurar", "configurada", "observada"] as const;
export type LineStatus = (typeof LINE_STATUSES)[number];

export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  sin_configurar: "Sin configurar",
  configurada: "Configurada",
  observada: "Observada",
};

/** Colores de las anotaciones según estado (los usa el visor y el PDF). */
export const LINE_STATUS_COLORS: Record<LineStatus, string> = {
  sin_configurar: "#8A8F96",
  configurada: "#1F3A5F",
  observada: "#B5532F",
};

/** Referencia legible: 7 -> "COT-0007". */
export function projectReference(id: number): string {
  return `COT-${String(id).padStart(4, "0")}`;
}

/** Tramos de descuento por volumen (cantidad total de cortinas). */
export interface DiscountTier {
  minQty: number;
  percent: number;
}

export const DEFAULT_TIERS: DiscountTier[] = [
  { minQty: 20, percent: 5 },
  { minQty: 50, percent: 8 },
  { minQty: 100, percent: 12 },
];

/** Porcentaje de descuento que corresponde a una cantidad. */
export function volumeDiscount(quantity: number, tiers: DiscountTier[] = DEFAULT_TIERS): number {
  let percent = 0;
  for (const t of tiers) if (quantity >= t.minQty && t.percent > percent) percent = t.percent;
  return percent;
}

/** Lo mínimo de una línea para calcular el resumen. */
export interface SummaryLine {
  locationName: string;
  productName: string | null;
  quantity: number;
  unitPrice: number | null;
}

export interface ProjectSummary {
  windows: number; // cortinas totales (suma de cantidades)
  configured: number; // cortinas con precio
  pending: number; // cortinas sin configurar
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number; // precios con IGV incluido
  igv: number; // parte del total que corresponde al IGV (18%)
  byLocation: { name: string; quantity: number; amount: number }[];
  byProduct: { name: string; quantity: number; amount: number }[];
}

/** Agrupa y suma importes por una clave, conservando el orden de aparición. */
function groupBy(lines: SummaryLine[], key: (l: SummaryLine) => string) {
  const map = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const l of lines) {
    const k = key(l);
    const g = map.get(k) ?? { name: k, quantity: 0, amount: 0 };
    g.quantity += l.quantity;
    g.amount += (l.unitPrice ?? 0) * l.quantity;
    map.set(k, g);
  }
  return [...map.values()];
}

/** Totales del proyecto. El descuento por volumen se calcula sobre las cortinas configuradas. */
export function summarizeProject(lines: SummaryLine[], tiers: DiscountTier[] = DEFAULT_TIERS): ProjectSummary {
  const priced = lines.filter((l) => l.unitPrice != null);
  const windows = lines.reduce((s, l) => s + l.quantity, 0);
  const configured = priced.reduce((s, l) => s + l.quantity, 0);
  const subtotal = priced.reduce((s, l) => s + (l.unitPrice ?? 0) * l.quantity, 0);
  const discountPercent = volumeDiscount(configured, tiers);
  const discount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discount;
  return {
    windows,
    configured,
    pending: windows - configured,
    subtotal,
    discountPercent,
    discount,
    total,
    igv: Math.round(total - total / 1.18),
    byLocation: groupBy(lines, (l) => l.locationName || "Sin ubicación"),
    byProduct: groupBy(priced, (l) => l.productName ?? "Sin producto"),
  };
}

/** Siguiente etiqueta libre: ["V1","V2","V7"] -> "V8". */
export function nextLabel(existing: string[], prefix = "V"): string {
  let max = 0;
  for (const label of existing) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(label);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

/** Distancia en metros entre dos puntos relativos de una imagen calibrada. */
export function distanceMeters(
  a: { x: number; y: number },
  b: { x: number; y: number },
  image: { width: number; height: number },
  metersPerPx: number,
): number {
  const dx = (a.x - b.x) * image.width;
  const dy = (a.y - b.y) * image.height;
  return Math.hypot(dx, dy) * metersPerPx;
}

/** Calibración: dos puntos marcados que miden `meters` en la realidad -> metros por píxel. */
export function calibrate(
  a: { x: number; y: number },
  b: { x: number; y: number },
  image: { width: number; height: number },
  meters: number,
): number | null {
  const px = Math.hypot((a.x - b.x) * image.width, (a.y - b.y) * image.height);
  if (px < 1 || !(meters > 0)) return null;
  return meters / px;
}

/**
 * Sugiere el ancho (cm) de una cortina a partir del rectángulo dibujado sobre
 * el plano: en planta la ventana se ve como un tramo de muro, así que el lado
 * largo del rectángulo es el ancho. El alto no se ve en planta: usamos uno
 * típico que el cliente puede corregir. Redondeamos a 10 cm.
 */
export function suggestSize(
  rect: { w: number; h: number },
  image: { width: number; height: number },
  metersPerPx: number,
  defaultHeight = 160,
): { width: number; height: number } {
  const longPx = Math.max(rect.w * image.width, rect.h * image.height);
  const width = Math.round((longPx * metersPerPx * 100) / 10) * 10;
  return { width, height: defaultHeight };
}
