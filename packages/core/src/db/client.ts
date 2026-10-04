/**
 * Conexión a PostgreSQL.
 * - En local: Postgres en tu máquina (DATABASE_URL=postgres://...@localhost/...).
 * - En producción: Neon. Usa la URL "pooled" de Neon en DATABASE_URL.
 * Guardamos la conexión (y la instancia de Drizzle) en globalThis: se crea una
 * sola vez por proceso, tanto en producción como en las recargas en caliente
 * de `next dev`. Crear un cliente por consulta agota las conexiones de Postgres.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as baseSchema from "./schema";
import * as projectSchema from "./project-schema";

// Unimos los dos esquemas: las tablas de proyectos solo existen en las bases
// de las apps que las usan (cortinas); toldos simplemente no las consulta.
const schema = { ...baseSchema, ...projectSchema };

/**
 * Limpia la URL tal como suele pegarse en el panel de Vercel: espacios, comillas,
 * el prefijo `psql '...'` del snippet de Neon o `DATABASE_URL=`. También quita
 * `channel_binding`, que postgres.js no necesita.
 */
export function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  url = url.replace(/^DATABASE_URL\s*=\s*/, "").replace(/^psql\s+/, "").trim();
  url = url.replace(/^['"]|['"]$/g, "").trim();
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode") && !/localhost|127\.0\.0\.1/.test(u.hostname)) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return url;
  }
}

function createDb(url: string) {
  // prepare: false es necesario con el pooler de Neon (PgBouncer).
  // En Vercel cada función es una instancia pequeña: 1 conexión basta y no
  // agotamos el pooler; idle_timeout cierra conexiones de instancias dormidas.
  const serverless = !!process.env.VERCEL;
  return drizzle(
    postgres(normalizeDatabaseUrl(url), { prepare: false, max: serverless ? 1 : 5, idle_timeout: serverless ? 20 : undefined, connect_timeout: 10 }),
    { schema },
  );
}

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createDb> };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL (ver .env.example).");
  globalForDb.__db ??= createDb(url);
  return globalForDb.__db;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
