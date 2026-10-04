/**
 * Autenticación sencilla del panel de administración.
 * - Las contraseñas se guardan con hash bcrypt (nunca en texto plano).
 * - Al iniciar sesión guardamos un token JWT firmado en una cookie httpOnly.
 * - `proxy.ts` y las páginas del admin verifican ese token.
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 7;

export interface Session {
  userId: number;
  email: string;
  name: string;
}

function secretKey() {
  const secret = process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" ? "dev-secret-cambiar-en-produccion" : "");
  if (!secret) throw new Error("Falta AUTH_SECRET en producción.");
  return new TextEncoder().encode(secret);
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { userId: Number(payload.userId), email: String(payload.email), name: String(payload.name) };
  } catch {
    return null;
  }
}

/** Opciones de la cookie de sesión. */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
