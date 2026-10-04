/**
 * Esquema de base de datos (Drizzle ORM + PostgreSQL).
 *
 * Es genérico a propósito: "productModels" sirve para toldos y también para
 * cortinas; el campo `type` distingue la familia de producto en cada app.
 * Cada app (toldos, cortinas) usa su propia base de datos con este esquema.
 */
import { boolean, date, integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const productModels = pgTable("product_models", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  minWidth: integer("min_width").notNull(),
  maxWidth: integer("max_width").notNull(),
  minProjection: integer("min_projection").notNull(),
  maxProjection: integer("max_projection").notNull(),
  basePrice: integer("base_price").notNull(),
  pricePerM2: integer("price_per_m2").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const fabrics = pgTable("fabrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  collection: text("collection").notNull().default(""),
  hex: text("hex").notNull(),
  pattern: text("pattern").notNull().default("liso"), // liso | rayas
  stripeHex: text("stripe_hex"),
  surchargePerM2: integer("surcharge_per_m2").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const frameColors = pgTable("frame_colors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ral: text("ral").notNull().default(""),
  hex: text("hex").notNull(),
  surcharge: integer("surcharge").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const priceRules = pgTable("price_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // fijo | por_m2 | porcentaje
  amount: real("amount").notNull(),
  drive: text("drive"), // manual | motor | sensor | null (= cualquiera)
  modelType: text("model_type"), // null = cualquier tipo
  minArea: real("min_area"),
  active: boolean("active").notNull().default(true),
});

export const serviceZones = pgTable("service_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  postalFrom: integer("postal_from").notNull(),
  postalTo: integer("postal_to").notNull(),
  active: boolean("active").notNull().default(true),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().default(""),
  status: text("status").notNull().default("nuevo"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  postalCode: text("postal_code").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  zoneName: text("zone_name"),
  preferredDate: date("preferred_date", { mode: "string" }).notNull(),
  preferredSlot: text("preferred_slot").notNull(),
  visitAt: timestamp("visit_at", { mode: "date" }),
  message: text("message").notNull().default(""),
  // Snapshot de la configuración con nombres legibles (por si luego cambia el catálogo).
  configuration: jsonb("configuration").$type<LeadConfiguration | null>(),
  estimatedPrice: integer("estimated_price"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const leadPhotos = pgTable("lead_photos", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  author: text("author").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Configuración guardada dentro del lead (ids + nombres legibles). */
export interface LeadConfiguration {
  modelId: number;
  modelName: string;
  modelType: string;
  width: number;
  projection: number;
  fabricId: number;
  fabricName: string;
  fabricHex: string;
  fabricPattern: string;
  fabricStripeHex: string | null;
  frameColorId: number;
  frameColorName: string;
  frameHex: string;
  drive: "manual" | "motor" | "sensor";
}

export type ProductModel = typeof productModels.$inferSelect;
export type Fabric = typeof fabrics.$inferSelect;
export type FrameColor = typeof frameColors.$inferSelect;
export type PriceRule = typeof priceRules.$inferSelect;
export type ServiceZone = typeof serviceZones.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadPhoto = typeof leadPhotos.$inferSelect;
export type LeadNote = typeof leadNotes.$inferSelect;
