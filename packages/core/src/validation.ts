/**
 * Validaciones compartidas (cliente y servidor) con Zod.
 * Usar el mismo esquema en el formulario y en la API evita que se desincronicen.
 */
import { z } from "zod";

/** Código postal neerlandés: 4 cifras + 2 letras, ej. "1012 AB". */
export const POSTAL_CODE_REGEX = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;

/** Normaliza "1012ab" -> "1012 AB". */
export function normalizePostalCode(raw: string): string {
  const clean = raw.replace(/\s+/g, "").toUpperCase();
  return clean.length === 6 ? `${clean.slice(0, 4)} ${clean.slice(4)}` : raw.trim().toUpperCase();
}

/** Zona de servicio: un rango de códigos postales (parte numérica). */
export interface ZoneRange {
  name: string;
  postalFrom: number;
  postalTo: number;
  active: boolean;
}

/** Devuelve la zona que cubre el código postal, o null si está fuera. */
export function findZone<T extends ZoneRange>(postalCode: string, zones: T[]): T | null {
  if (!POSTAL_CODE_REGEX.test(postalCode.trim())) return null;
  const digits = Number(postalCode.trim().slice(0, 4));
  return zones.find((z) => z.active && digits >= z.postalFrom && digits <= z.postalTo) ?? null;
}

/** Fecha YYYY-MM-DD en hora local (evita líos de zona horaria con toISOString). */
export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Regla de fecha preferida: a partir de mañana, como máximo a 90 días,
 * y nunca en domingo (no hacemos visitas).
 */
export function validateVisitDate(dateKey: string, today = new Date()): string | null {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return "Elige una fecha.";
  const date = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
  if (date < start) return "La visita tiene que ser a partir de mañana.";
  if (date > end) return "Solo agendamos visitas en los próximos tres meses.";
  if (date.getDay() === 0) return "Los domingos no hacemos visitas.";
  return null;
}

export const driveSchema = z.enum(["manual", "motor", "sensor"]);

/** Configuración guardada del configurador (la API recalcula el precio). */
export const configurationSchema = z.object({
  modelId: z.number().int().positive(),
  width: z.number().int().positive(),
  projection: z.number().int().positive(),
  fabricId: z.number().int().positive(),
  frameColorId: z.number().int().positive(),
  drive: driveSchema,
});

/** Formulario "Solicitar visita". */
export const quoteRequestSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre."),
  email: z.email("Revisa el correo electrónico."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,16}$/, "Revisa el teléfono."),
  postalCode: z.string().trim().regex(POSTAL_CODE_REGEX, "Formato: 1234 AB."),
  address: z.string().trim().min(3, "Necesitamos la dirección para la visita."),
  city: z.string().trim().min(2, "Escribe tu localidad."),
  preferredDate: z.string().refine((v) => validateVisitDate(v) === null, {
    error: (issue) => validateVisitDate(String(issue.input)) ?? "Fecha no válida.",
  }),
  preferredSlot: z.enum(["manana", "tarde"]),
  message: z.string().trim().max(1000).optional().default(""),
  configuration: configurationSchema.nullable(),
  consent: z.literal(true, { error: "Necesitamos tu permiso para contactarte." }),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

/** Convierte los errores de Zod en { campo: mensaje } para pintarlos en el formulario. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
