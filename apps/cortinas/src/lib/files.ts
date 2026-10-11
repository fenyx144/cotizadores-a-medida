/**
 * Archivos de proyectos (planos, fotos, adjuntos). Usa S3/R2 si está configurado
 * (o disco local en desarrollo); si no (Vercel sin bucket), guarda en Postgres.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { getFileWithDemoFallback, getStorage, type StoredFile } from "@portafolio/core/storage";
import { getDb, schema } from "./db";

/** Límite en el respaldo de Postgres (y el de cuerpo de Vercel ronda 4,5 MB). */
export const DB_FILE_LIMIT = 4 * 1024 * 1024;

export function usesDbStorage() {
  return !process.env.S3_BUCKET && !!process.env.VERCEL;
}

export class FileTooLargeError extends Error {
  constructor() {
    super("El archivo supera 4 MB. Reduzca su tamaño e inténtelo de nuevo.");
  }
}

export async function putFile(key: string, body: Uint8Array, contentType: string) {
  if (!usesDbStorage()) return getStorage().put(key, body, contentType);
  if (body.byteLength > DB_FILE_LIMIT) throw new FileTooLargeError();
  await getDb().insert(schema.storedFiles).values({ key, contentType, data: Buffer.from(body) });
}

export async function getFile(key: string, origin: string): Promise<StoredFile | null> {
  const [row] = await getDb().select().from(schema.storedFiles).where(eq(schema.storedFiles.key, key));
  if (row) return { body: new Uint8Array(row.data), contentType: row.contentType };
  return getFileWithDemoFallback(key, origin);
}

export async function deleteFile(key: string) {
  await getDb().delete(schema.storedFiles).where(eq(schema.storedFiles.key, key));
  if (!usesDbStorage()) await getStorage().delete(key).catch(() => {});
}
