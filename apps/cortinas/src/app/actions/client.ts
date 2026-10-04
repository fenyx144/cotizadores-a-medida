"use server";
/**
 * Acciones del área de cliente: registro, ingreso, salida y nuevo proyecto.
 * Se usan desde formularios con useActionState.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CLIENT_COOKIE, createSessionToken, hashPassword, sessionCookieOptions, verifyPassword } from "@portafolio/core/auth";
import { PHONE_REGEX, RUC_REGEX, fieldErrors } from "@portafolio/core/validation";
import { projectReference } from "@portafolio/core/projects";
import { getDb, schema } from "@/lib/db";
import { requireClient } from "@/lib/client-session";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

/** Solo aceptamos rutas internas en ?next= (evita redirecciones abiertas). */
function safeNext(value: FormDataEntryValue | null) {
  const v = String(value ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/cliente";
}

async function startSession(client: { id: number; email: string; name: string }) {
  const token = await createSessionToken({ userId: client.id, email: client.email, name: client.name }, "client");
  (await cookies()).set(CLIENT_COOKIE, token, sessionCookieOptions);
}

const registerSchema = z.object({
  name: z.string().trim().min(3, "Escriba su nombre completo"),
  company: z.string().trim().min(2, "Indique la institución o empresa"),
  ruc: z.string().trim().regex(RUC_REGEX, "RUC de 11 dígitos (empieza con 10, 15, 17 o 20)"),
  phone: z.string().trim().regex(PHONE_REGEX, "Teléfono no válido"),
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const data = parsed.data;
  const db = getDb();
  const [existing] = await db.select().from(schema.clients).where(eq(schema.clients.email, data.email));
  if (existing?.passwordHash) return { fields: { email: "Ya existe una cuenta con este correo. Ingrese con su contraseña." } };

  const values = { name: data.name, company: data.company, ruc: data.ruc, phone: data.phone, kind: "empresa", passwordHash: await hashPassword(data.password) };
  // Si antes pidió una cotización rápida sin cuenta, reutilizamos ese cliente.
  const [client] = existing
    ? await db.update(schema.clients).set(values).where(eq(schema.clients.id, existing.id)).returning()
    : await db.insert(schema.clients).values({ ...values, email: data.email }).returning();
  await startSession(client);
  redirect(safeNext(formData.get("next")));
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [client] = await getDb().select().from(schema.clients).where(eq(schema.clients.email, email));
  if (!client?.passwordHash || !(await verifyPassword(password, client.passwordHash))) return { error: "Correo o contraseña incorrectos." };
  await startSession(client);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(CLIENT_COOKIE);
  redirect("/");
}

const projectSchema = z.object({
  name: z.string().trim().min(3, "Ponga un nombre al proyecto (p. ej. Pabellón A)"),
  sector: z.enum(["educacion", "oficinas", "salud", "otro"]),
  district: z.string().trim().min(2, "Indique el distrito"),
  address: z.string().trim().min(5, "Indique la dirección de la obra"),
});

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireClient();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const db = getDb();
  const [project] = await db.insert(schema.projects).values({ ...parsed.data, clientId: session.userId, kind: "empresa" }).returning();
  await db.update(schema.projects).set({ reference: projectReference(project.id) }).where(eq(schema.projects.id, project.id));
  // Primera ubicación vacía para que el editor no empiece en blanco.
  await db.insert(schema.locations).values({ projectId: project.id, building: "Edificio principal", floor: "Piso 1", room: "Ambiente 1" });
  redirect(`/proyecto/${project.id}`);
}
