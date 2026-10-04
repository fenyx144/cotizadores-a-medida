/**
 * Esquema de "proyectos" (Fase 2, app de cortinas).
 *
 * Un cliente profesional (empresa con RUC) o particular crea un proyecto.
 * El proyecto se divide en ubicaciones (edificio > piso > ambiente) y cada
 * ubicación tiene líneas: una ventana (o grupo de ventanas iguales) con su
 * configuración y cantidad. Si hay plano o foto, la línea guarda además su
 * anotación (punto o rectángulo) en coordenadas relativas 0-1, así no depende
 * del tamaño en píxeles de la imagen.
 */
import { integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  ruc: text("ruc").notNull().default(""),
  phone: text("phone").notNull().default(""),
  // Nulo para clientes del flujo rápido "particular" sin cuenta.
  passwordHash: text("password_hash"),
  kind: text("kind").notNull().default("empresa"), // empresa | particular
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().default(""),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("empresa"),
  status: text("status").notNull().default("borrador"),
  sector: text("sector").notNull().default("educacion"),
  address: text("address").notNull().default(""),
  district: text("district").notNull().default(""),
  // "Solicitar medición en obra": cantidad aproximada de ventanas + fecha sugerida.
  measurementRequest: jsonb("measurement_request").$type<MeasurementRequest | null>(),
  notes: text("notes").notNull().default(""),
  sentAt: timestamp("sent_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  building: text("building").notNull().default(""),
  floor: text("floor").notNull().default(""),
  room: text("room").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Plano del proyecto o foto de una ubicación. */
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("plano"), // plano | foto
  name: text("name").notNull().default(""),
  imageKey: text("image_key").notNull(),
  width: integer("width").notNull(), // px de la imagen original
  height: integer("height").notNull(),
  // Escala calibrada: metros por píxel (null = sin calibrar).
  metersPerPx: real("meters_per_px"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const lines = pgTable("lines", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  locationId: integer("location_id").references(() => locations.id, { onDelete: "set null" }),
  planId: integer("plan_id").references(() => plans.id, { onDelete: "set null" }),
  label: text("label").notNull().default(""), // V1, V2...
  // Anotación: "point" usa x,y; "rect" usa x,y,w,h. Todo relativo (0-1).
  shape: text("shape"),
  x: real("x"),
  y: real("y"),
  w: real("w"),
  h: real("h"),
  // Medidas de la ventana (cm). Pueden existir sin producto elegido (p. ej. al importar un CSV).
  width: integer("width"),
  height: integer("height"),
  config: jsonb("config").$type<LineConfig | null>(),
  quantity: integer("quantity").notNull().default(1),
  note: text("note").notNull().default(""),
  unitPrice: integer("unit_price"),
  status: text("status").notNull().default("sin_configurar"), // sin_configurar | configurada | observada
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lineComments = pgTable("line_comments", {
  id: serial("id").primaryKey(),
  lineId: integer("line_id")
    .notNull()
    .references(() => lines.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  role: text("role").notNull().default("admin"), // admin | client
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export interface MeasurementRequest {
  approxWindows: number;
  address: string;
  district: string;
  preferredDate?: string;
  contactPhone?: string;
}

/** Configuración de una línea con snapshot de nombres legibles. */
export interface LineConfig {
  modelId: number;
  modelName: string;
  modelType: string;
  fabricId: number;
  fabricName: string;
  fabricHex: string;
  frameColorId: number;
  frameColorName: string;
  drive: "manual" | "motor" | "sensor";
}

export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Line = typeof lines.$inferSelect;
export type LineComment = typeof lineComments.$inferSelect;
