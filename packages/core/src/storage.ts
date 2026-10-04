/**
 * Almacenamiento de archivos (fotos de los clientes) con dos "drivers":
 * - local: guarda en disco (.data/uploads). Ideal para desarrollo.
 * - s3: cualquier servicio compatible con S3, por ejemplo Cloudflare R2.
 * Se elige automáticamente: si existe S3_BUCKET usamos S3/R2, si no, local.
 * El resto de la app solo usa getStorage() y no sabe qué driver hay detrás.
 */
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export interface StoredFile {
  body: Uint8Array;
  contentType: string;
}

export interface StorageDriver {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

/** Tipos y tamaño permitidos para las fotos que suben los clientes. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_UPLOAD_FILES = 4;

/** Valida un archivo subido. Devuelve un mensaje de error o null. */
export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Solo aceptamos fotos JPG, PNG, WEBP o HEIC.";
  if (file.size > MAX_UPLOAD_BYTES) return "Cada foto puede pesar como máximo 8 MB.";
  return null;
}

/** Genera una clave única y segura para guardar el archivo. */
export function makeKey(folder: string, fileName: string): string {
  const ext = (fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = crypto.randomUUID();
  return `${folder}/${id}.${ext}`;
}

class LocalStorage implements StorageDriver {
  constructor(private root: string) {}
  private resolve(key: string) {
    // Evitamos rutas tipo "../../etc/passwd".
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root))) throw new Error("Clave no válida");
    return full;
  }
  async put(key: string, body: Uint8Array, contentType: string) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    await writeFile(`${full}.meta`, contentType);
  }
  async get(key: string) {
    try {
      const full = this.resolve(key);
      const [body, contentType] = await Promise.all([readFile(full), readFile(`${full}.meta`, "utf8")]);
      return { body: new Uint8Array(body), contentType };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    const full = this.resolve(key);
    await Promise.allSettled([unlink(full), unlink(`${full}.meta`)]);
  }
}

class S3Storage implements StorageDriver {
  private client: S3Client;
  constructor(private bucket: string) {
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto", // R2 usa "auto"
      endpoint: process.env.S3_ENDPOINT, // ej: https://<account>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
  }
  async put(key: string, body: Uint8Array, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return { body: await res.Body.transformToByteArray(), contentType: res.ContentType || "application/octet-stream" };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let instance: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (instance) return instance;
  const bucket = process.env.S3_BUCKET;
  instance = bucket ? new S3Storage(bucket) : new LocalStorage(process.env.UPLOAD_DIR || path.join(process.cwd(), ".data/uploads"));
  return instance;
}
