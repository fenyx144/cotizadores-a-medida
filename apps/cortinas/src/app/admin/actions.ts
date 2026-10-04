"use server";
/** Acciones del panel interno (Server Actions). */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@portafolio/core/auth";
import { LINE_STATUSES, PROJECT_STATUSES, type LineStatus, type ProjectStatus } from "@portafolio/core/projects";
import { getDb, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await getDb().select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Correo o contraseña incorrectos." };
  const token = await createSessionToken({ userId: user.id, email: user.email, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function updateProjectStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as ProjectStatus;
  if (!PROJECT_STATUSES.includes(status)) return;
  await getDb().update(schema.projects).set({ status, updatedAt: new Date() }).where(eq(schema.projects.id, id));
  revalidatePath("/admin", "layout");
}

/** Comentario del admin sobre una anotación; opcionalmente cambia su estado (p. ej. a "observada"). */
export async function commentLine(lineId: number, body: string, status?: LineStatus) {
  const session = await requireAdmin();
  const db = getDb();
  const [line] = await db.select().from(schema.lines).where(eq(schema.lines.id, lineId));
  if (!line) return { ok: false as const, error: "Línea no encontrada." };
  if (body.trim()) await db.insert(schema.lineComments).values({ lineId, body: body.trim().slice(0, 1000), author: session.name, role: "admin" });
  if (status && LINE_STATUSES.includes(status)) await db.update(schema.lines).set({ status }).where(eq(schema.lines.id, lineId));
  revalidatePath(`/admin/proyectos/${line.projectId}`);
  const [lines, comments] = await Promise.all([
    db.select().from(schema.lines).where(eq(schema.lines.projectId, line.projectId)),
    db.select().from(schema.lineComments).where(eq(schema.lineComments.lineId, lineId)),
  ]);
  return { ok: true as const, lines, comments };
}
