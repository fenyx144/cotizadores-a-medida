/**
 * Validaciones compartidas (cliente y servidor) con Zod.
 * Usar el mismo esquema en el formulario y en la API evita que se desincronicen.
 */
import { z } from "zod";

/** Zona de servicio: un distrito activo, administrable desde el panel. */
export interface ZoneLike {
  name: string;
  active: boolean;
}

/** Quita tildes y mayúsculas para comparar nombres ("Yanahuara" == "yanahuara"). */
export function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

/** Devuelve la zona activa con ese nombre de distrito, o null si no trabajamos allí. */
export function findZone<T extends ZoneLike>(district: string, zones: T[]): T | null {
  const target = normalizeName(district);
  if (!target) return null;
  return zones.find((z) => z.active && normalizeName(z.name) === target) ?? null;
}

/** Teléfono genérico: 7 a 15 dígitos, con + inicial, espacios o guiones opcionales. */
export const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,16}$/;

/** RUC peruano: 11 dígitos que empiezan por 10, 15, 17 o 20. */
export const RUC_REGEX = /^(10|15|17|20)\d{9}$/;

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
  phone: z.string().trim().regex(PHONE_REGEX, "Revisa el teléfono."),
  district: z.string().trim().min(2, "Elige tu distrito."),
  address: z.string().trim().min(3, "Necesitamos la dirección para la visita."),
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
