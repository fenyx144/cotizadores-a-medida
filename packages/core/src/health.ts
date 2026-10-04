/**
 * Diagnóstico sin secretos para /api/salud: ¿hay variables? ¿responde la base
 * de datos? ¿existen las tablas que la app necesita? Nunca devuelve la URL ni
 * contraseñas; solo el nombre de la base, el host y el código de error.
 */
import { sql } from "drizzle-orm";
import { getDb, normalizeDatabaseUrl } from "./db/client";

const HINTS: Record<string, string> = {
  "42P01": "Faltan tablas: DATABASE_URL apunta a otra base (¿neondb?) o falta `db:push` + seed.",
  "42703": "Columnas distintas: DATABASE_URL apunta a la base de la otra app o falta `db:push`.",
  "3D000": "La base de datos de DATABASE_URL no existe.",
  "28P01": "Usuario o contraseña incorrectos en DATABASE_URL.",
  ENOTFOUND: "Host de DATABASE_URL no encontrado.",
};

export async function healthReport(requiredTables: string[]) {
  const raw = process.env.DATABASE_URL;
  const env = { DATABASE_URL: !!raw, AUTH_SECRET: !!process.env.AUTH_SECRET, S3_BUCKET: !!process.env.S3_BUCKET };
  let target: { host?: string; database?: string } = {};
  if (raw) {
    try {
      const u = new URL(normalizeDatabaseUrl(raw));
      target = { host: u.hostname, database: u.pathname.slice(1) };
    } catch {
      target = { host: "URL no válida" };
    }
  }
  if (!raw) return { ok: false, env, target, db: { error: "Falta DATABASE_URL" } };
  try {
    const rows = await getDb().execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const present = new Set(Array.from(rows as unknown as { table_name: string }[], (r) => r.table_name));
    const missing = requiredTables.filter((t) => !present.has(t));
    return { ok: missing.length === 0, env, target, db: { connected: true, missingTables: missing, hint: missing.length ? HINTS["42P01"] : undefined } };
  } catch (e) {
    const code = (e as { code?: string }).code ?? "desconocido";
    return { ok: false, env, target, db: { connected: false, code, hint: HINTS[code] } };
  }
}
