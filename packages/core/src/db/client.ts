/**
 * Conexión a PostgreSQL.
 * - En local: Postgres en tu máquina (DATABASE_URL=postgres://...@localhost/...).
 * - En producción: Neon. Usa la URL "pooled" de Neon en DATABASE_URL.
 * Guardamos la conexión en globalThis para no abrir una nueva en cada
 * recarga en caliente (hot reload) de `next dev`.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pgClient?: ReturnType<typeof postgres> };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL (ver .env.example).");
  // prepare: false es necesario con el pooler de Neon (PgBouncer).
  const client = globalForDb.__pgClient ?? postgres(url, { prepare: false, max: 5 });
  if (process.env.NODE_ENV !== "production") globalForDb.__pgClient = client;
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
