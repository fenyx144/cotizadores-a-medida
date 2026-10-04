/**
 * Motor de precios y reglas del configurador.
 *
 * Este archivo es "puro": no toca base de datos ni React. Recibe datos del
 * catálogo (modelos, telas, colores, reglas de precio) y una configuración
 * elegida por el cliente, y devuelve el precio orientativo con su desglose.
 * Al ser puro es fácil de testear (ver test/pricing.test.ts) y de reutilizar
 * en otras apps (por ejemplo, la futura app de cortinas).
 */

/** Tipo de accionamiento: a mano, con motor, o motor + sensor viento/sol. */
export type Drive = "manual" | "motor" | "sensor";

export const DRIVE_LABELS: Record<Drive, string> = {
  manual: "Manual con manivela",
  motor: "Motor con mando",
  sensor: "Motor + sensor viento y sol",
};

/** Lo mínimo que el motor de precios necesita saber de un modelo. */
export interface PricingModel {
  id: number;
  name: string;
  type: string; // ej: "retractil", "cofre", "vertical", "pergola"
  minWidth: number; // todas las medidas en centímetros
  maxWidth: number;
  minProjection: number;
  maxProjection: number;
  basePrice: number; // euros
  pricePerM2: number; // euros por m²
}

export interface PricingFabric {
  id: number;
  name: string;
  surchargePerM2: number;
}

export interface PricingFrameColor {
  id: number;
  name: string;
  surcharge: number;
}

/**
 * Regla de precio administrable desde el panel.
 * - fijo: suma un importe fijo.
 * - por_m2: suma importe × m².
 * - porcentaje: suma un % sobre el subtotal (se aplica al final).
 * Las condiciones (drive, modelType, minArea) son opcionales: si están vacías
 * la regla aplica siempre.
 */
export type PriceRuleKind = "fijo" | "por_m2" | "porcentaje";

export interface PricingRule {
  id: number;
  name: string;
  kind: PriceRuleKind;
  amount: number;
  drive: Drive | null;
  modelType: string | null;
  minArea: number | null;
  active: boolean;
}

/** Configuración elegida por el cliente. */
export interface Configuration {
  modelId: number;
  width: number; // cm
  projection: number; // cm (salida; en toldos verticales es la caída)
  fabricId: number;
  frameColorId: number;
  drive: Drive;
}

export interface PriceLine {
  label: string;
  amount: number;
}

export interface PriceResult {
  area: number; // m²
  lines: PriceLine[];
  total: number; // redondeado a decenas
}

/** Paso de las medidas en el configurador (10 cm). */
export const SIZE_STEP = 10;

/** Superficie en m² a partir de medidas en cm. */
export function areaM2(width: number, projection: number): number {
  return Math.round((width / 100) * (projection / 100) * 100) / 100;
}

/** Limita un valor entre min y max y lo ajusta al paso de 10 cm. */
export function clampToStep(value: number, min: number, max: number, step = SIZE_STEP): number {
  const stepped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/** Tipos en los que la salida no puede superar el ancho (los brazos chocarían). */
const ARM_TYPES = ["retractil", "cofre"];

/**
 * Valida las medidas contra las reglas del modelo.
 * Devuelve una lista de errores legibles (vacía = todo correcto).
 */
export function validateDimensions(model: PricingModel, width: number, projection: number): string[] {
  const errors: string[] = [];
  const m = (cm: number) => `${(cm / 100).toFixed(2).replace(".", ",")} m`;

  if (width < model.minWidth || width > model.maxWidth) {
    errors.push(`El ancho debe estar entre ${m(model.minWidth)} y ${m(model.maxWidth)}.`);
  }
  if (projection < model.minProjection || projection > model.maxProjection) {
    errors.push(`La medida debe estar entre ${m(model.minProjection)} y ${m(model.maxProjection)}.`);
  }
  if (ARM_TYPES.includes(model.type) && projection > width) {
    errors.push("La salida no puede ser mayor que el ancho: los brazos no cabrían.");
  }
  return errors;
}

/** ¿La regla aplica a esta configuración? */
export function ruleApplies(rule: PricingRule, ctx: { drive: Drive; modelType: string; area: number }): boolean {
  if (!rule.active) return false;
  if (rule.drive && rule.drive !== ctx.drive) return false;
  if (rule.modelType && rule.modelType !== ctx.modelType) return false;
  if (rule.minArea != null && ctx.area < rule.minArea) return false;
  return true;
}

/**
 * Calcula el precio orientativo ("desde") de una configuración.
 * Orden: base del modelo + m² + recargo de tela + recargo de color
 * + reglas fijas/por m² y, al final, las reglas de porcentaje.
 */
export function calculatePrice(
  config: Configuration,
  catalog: {
    model: PricingModel;
    fabric?: PricingFabric | null;
    frameColor?: PricingFrameColor | null;
    rules: PricingRule[];
  },
): PriceResult {
  const { model, fabric, frameColor, rules } = catalog;
  const area = areaM2(config.width, config.projection);
  const lines: PriceLine[] = [];

  lines.push({ label: `${model.name} (${area.toString().replace(".", ",")} m²)`, amount: model.basePrice + area * model.pricePerM2 });

  if (fabric && fabric.surchargePerM2 > 0) {
    lines.push({ label: `Lona ${fabric.name}`, amount: area * fabric.surchargePerM2 });
  }
  if (frameColor && frameColor.surcharge > 0) {
    lines.push({ label: `Estructura ${frameColor.name}`, amount: frameColor.surcharge });
  }

  const ctx = { drive: config.drive, modelType: model.type, area };
  const applicable = rules.filter((r) => ruleApplies(r, ctx));

  // Primero reglas de importe (fijo y por m²)...
  for (const rule of applicable) {
    if (rule.kind === "fijo") lines.push({ label: rule.name, amount: rule.amount });
    if (rule.kind === "por_m2") lines.push({ label: rule.name, amount: rule.amount * area });
  }
  // ...y después los porcentajes sobre ese subtotal.
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  for (const rule of applicable) {
    if (rule.kind === "porcentaje") lines.push({ label: rule.name, amount: (subtotal * rule.amount) / 100 });
  }

  const rounded = lines.map((l) => ({ ...l, amount: Math.round(l.amount) }));
  const exact = lines.reduce((sum, l) => sum + l.amount, 0);
  // Redondeamos a la decena: es un precio orientativo, no una factura.
  return { area, lines: rounded, total: Math.round(exact / 10) * 10 };
}

/**
 * Formatea un importe en soles peruanos: 1000 -> "S/ 1,000".
 * El símbolo es configurable por si otra app necesita otra moneda.
 */
export function formatMoney(amount: number, symbol = "S/"): string {
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(amount));
  return `${symbol} ${n}`;
}

/** Formatea centímetros como metros: 350 -> "3,50 m" */
export function formatMeters(cm: number): string {
  return `${(cm / 100).toFixed(2).replace(".", ",")} m`;
}
