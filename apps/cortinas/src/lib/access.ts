/** ¿Quién puede ver un proyecto? El admin o el cliente dueño. */
import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { getSession } from "./session";
import { getClientSession } from "./client-session";

export async function canViewProject(projectId: number): Promise<boolean> {
  if (await getSession()) return true;
  const client = await getClientSession();
  if (!client) return false;
  const [p] = await getDb().select({ clientId: schema.projects.clientId }).from(schema.projects).where(eq(schema.projects.id, projectId));
  return p?.clientId === client.userId;
}
