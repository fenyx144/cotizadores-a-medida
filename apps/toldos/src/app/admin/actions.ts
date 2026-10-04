"use server";
/**
 * Acciones de servidor del panel (Server Actions).
 * Se llaman directamente desde formularios: <form action={...}>.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@portafolio/core/auth";
import { LEAD_STATUSES, type LeadStatus } from "@portafolio/core/leads";
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

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as LeadStatus;
  if (!LEAD_STATUSES.includes(status)) return;
  await getDb().update(schema.leads).set({ status, updatedAt: new Date() }).where(eq(schema.leads.id, id));
  revalidatePath("/admin", "layout");
}

export async function scheduleVisit(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const value = String(formData.get("visitAt") ?? "");
  const visitAt = value ? new Date(value) : null;
  await getDb().update(schema.leads).set({ visitAt, updatedAt: new Date() }).where(eq(schema.leads.id, id));
  revalidatePath("/admin", "layout");
}

export async function addNote(formData: FormData) {
  const session = await requireAdmin();
  const leadId = Number(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await getDb().insert(schema.leadNotes).values({ leadId, body, author: session.name });
  revalidatePath(`/admin/leads/${leadId}`);
}
