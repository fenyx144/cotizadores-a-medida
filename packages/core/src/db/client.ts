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

function createDb(url: string) {
  // prepare: false es necesario con el pooler de Neon (PgBouncer).
  return drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
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
