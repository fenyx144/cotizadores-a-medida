/**
 * Fábrica de manejadores REST para el CRUD del panel (modelos, telas, etc.).
 *
 * En la app basta con:
 *   export const { GET, POST } = collection;  // /api/admin/[recurso]
 *   export const { PATCH, DELETE } = item;    // /api/admin/[recurso]/[id]
 * Así cada recurso nuevo (también en la app de cortinas) se añade con una
 * tabla de Drizzle + un esquema Zod, sin repetir código.
 */
import { asc, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { ZodType } from "zod";
import type { Db } from "./db/client";
import { fieldErrors } from "./validation";
import { ZodError } from "zod";

export interface CrudResource {
  table: PgTable & { id: PgColumn };
  schema: ZodType<Record<string, unknown>>;
  orderBy?: PgColumn;
}

type Ctx = { params: Promise<{ resource: string; id?: string }> };

export function createCrudHandlers(opts: {
  getDb: () => Db;
  resources: Record<string, CrudResource>;
  /** Devuelve true si la petición viene de un admin con sesión. */
  isAuthorized: () => Promise<boolean>;
}) {
  const json = (data: unknown, status = 200) => Response.json(data, { status });

  async function guard(ctx: Ctx) {
    if (!(await opts.isAuthorized())) return { error: json({ error: "No autorizado" }, 401) };
    const { resource, id } = await ctx.params;
    const res = opts.resources[resource];
    if (!res) return { error: json({ error: "Recurso desconocido" }, 404) };
    return { res, id: id ? Number(id) : undefined };
  }

  async function parse(res: CrudResource, req: Request, partial: boolean) {
    const body = await req.json();
    const schema = partial && "partial" in res.schema ? (res.schema as unknown as { partial(): ZodType }).partial() : res.schema;
    return schema.parse(body) as Record<string, unknown>;
  }

  function handleError(e: unknown) {
    if (e instanceof ZodError) return json({ error: "Revisa los campos", fields: fieldErrors(e) }, 422);
    console.error(e);
    return json({ error: "No se pudo guardar" }, 500);
  }

  return {
    collection: {
      async GET(_req: Request, ctx: Ctx) {
        const g = await guard(ctx);
        if (g.error) return g.error;
        const db = opts.getDb();
        const rows = await db
          .select()
          .from(g.res.table as PgTable)
          .orderBy(asc(g.res.orderBy ?? g.res.table.id));
        return json(rows);
      },
      async POST(req: Request, ctx: Ctx) {
        const g = await guard(ctx);
        if (g.error) return g.error;
        try {
          const data = await parse(g.res, req, false);
          const db = opts.getDb();
          const [row] = await db.insert(g.res.table).values(data).returning();
          return json(row, 201);
        } catch (e) {
          return handleError(e);
        }
      },
    },
    item: {
      async PATCH(req: Request, ctx: Ctx) {
        const g = await guard(ctx);
        if (g.error) return g.error;
        try {
          const data = await parse(g.res, req, true);
          const db = opts.getDb();
          const [row] = await db.update(g.res.table).set(data).where(eq(g.res.table.id, g.id!)).returning();
          return row ? json(row) : json({ error: "No encontrado" }, 404);
        } catch (e) {
          return handleError(e);
        }
      },
      async DELETE(_req: Request, ctx: Ctx) {
        const g = await guard(ctx);
        if (g.error) return g.error;
        try {
          const db = opts.getDb();
          await db.delete(g.res.table).where(eq(g.res.table.id, g.id!));
          return json({ ok: true });
        } catch (e) {
          return handleError(e);
        }
      },
    },
  };
}
