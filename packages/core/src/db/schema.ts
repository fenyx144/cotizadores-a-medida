/**
 * Esquema de base de datos (Drizzle ORM + PostgreSQL).
 *
 * Es genérico a propósito: "productModels" sirve para toldos y también para
 * cortinas; el campo `type` distingue la familia de producto en cada app.
 * Cada app (toldos, cortinas) usa su propia base de datos con este esquema.
 */
import { boolean, date, integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Materiales del catálogo (editables). Los productos guardan el slug. */
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  /** Atributos que aplican a este material y sus valores permitidos (vacío = todos). Lista vacía = todos los atributos. */
  attributes: jsonb("attributes").$type<FamilyAttribute[]>().notNull().default([]),
});

/**
 * Variantes de un producto con código propio (SKU). Cada una fija una combinación
 * (tela y/o color de perfil; vacío = cualquiera) y puede sumar un ajuste de precio.
 */
export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  fabricId: integer("fabric_id"),
  frameColorId: integer("frame_color_id"),
  attributes: text("attributes").notNull().default(""),
  /** Valores de atributo que fija la variante (ids separados por coma). */
  valueIds: text("value_ids").notNull().default(""),
  priceAdjustment: integer("price_adjustment").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Atributos genéricos del configurador (Tela, Color del perfil, Accionamiento, Lado del mando…).
 * kind: lista (opciones) | color (opciones con muestra) | numero | sino.
 */
export const attributes = pgTable("attributes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("lista"),
  /** generico: vale para todos los materiales · material: solo donde el material lo activa. */
  scope: text("scope").notNull().default("generico"),
  unit: text("unit").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Valores de un atributo. El recargo es fijo por unidad o por m². */
export const attributeValues = pgTable("attribute_values", {
  id: serial("id").primaryKey(),
  attributeId: integer("attribute_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull().default(""),
  hex: text("hex").notNull().default(""),
  surcharge: real("surcharge").notNull().default(0),
  surchargeKind: text("surcharge_kind").notNull().default("fijo"), // fijo | por_m2
  /** Solo para estos materiales o tipos de producto (coma); vacío = todos. */
  onlyFor: text("only_for").notNull().default(""),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Atributo que pide una familia: obligatorio o no, y valores permitidos (vacío = todos). */
export interface FamilyAttribute { attributeId: number; required: boolean; valueIds: number[] }

/** Plantilla / familia de productos: parámetros requeridos, medidas por defecto y opciones permitidas. */
export const productFamilies = pgTable("product_families", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  requiresFabric: boolean("requires_fabric").notNull().default(true),
  requiresFrame: boolean("requires_frame").notNull().default(true),
  requiresDrive: boolean("requires_drive").notNull().default(true),
  minWidth: integer("min_width").notNull().default(40),
  maxWidth: integer("max_width").notNull().default(300),
  minHeight: integer("min_height").notNull().default(40),
  maxHeight: integer("max_height").notNull().default(320),
  /** Listas separadas por comas; vacío = todas. */
  allowedDrives: text("allowed_drives").notNull().default(""),
  allowedFrameIds: text("allowed_frame_ids").notNull().default(""),
  allowedFabricIds: text("allowed_fabric_ids").notNull().default(""),
  /** Atributos que pide la familia, en orden. */
  attributes: jsonb("attributes").$type<FamilyAttribute[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Reglas de restricción del configurador.
 * - dimension: limita ancho/alto para una familia o producto (opcionalmente solo si se elige una opción).
 * - incompatibilidad: si se elige la opción A, la opción B queda deshabilitada (y viceversa).
 * Las opciones se codifican como "tipo:valor": tela:6, perfil:3, accionamiento:motor, material:blackout, producto:2, familia:1.
 */
export const constraintRules = pgTable("constraint_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** Efecto: bloquear | permitir (solo esos valores) | medidas | recargo. */
  kind: text("kind").notNull(),
  familyId: integer("family_id"),
  modelId: integer("model_id"),
  ifOption: text("if_option"),
  thenOption: text("then_option"),
  minWidth: integer("min_width"),
  maxWidth: integer("max_width"),
  minHeight: integer("min_height"),
  maxHeight: integer("max_height"),
  message: text("message").notNull().default(""),
  active: boolean("active").notNull().default(true),
  /** Condiciones unidas con Y: "[atributo] es uno de [valores]". Vacío = siempre. */
  conditions: jsonb("conditions").$type<RuleCondition[]>().notNull().default([]),
  /** Atributo y valores afectados (bloquear / permitir solo). */
  targetAttributeId: integer("target_attribute_id"),
  targetValueIds: jsonb("target_value_ids").$type<number[]>().notNull().default([]),
  surcharge: real("surcharge").notNull().default(0),
  surchargeKind: text("surcharge_kind").notNull().default("fijo"),
  /** Origen: "" (manual) o "matriz:<categoría>:<atributo A>:<atributo B>". */
  source: text("source").notNull().default(""),
});

export interface RuleCondition { attributeId: number; valueIds: number[] }

export const productModels = pgTable("product_models", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  // Campos extra para catálogos con filtros (los usa la app de cortinas).
  material: text("material").notNull().default(""),
  uses: text("uses").notNull().default(""), // lista separada por comas: "educacion,oficinas"
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  /** Ficha técnica: filas clave/valor ("Mecanismo" -> "Cadena con freno"). */
  familyId: integer("family_id"),
  specs: jsonb("specs").$type<{ label: string; value: string }[]>().notNull().default([]),
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
  // Tipos de producto en los que se puede usar (separados por comas). Vacío = todos.
  types: text("types").notNull().default(""),
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
  /** Condición opcional por opción elegida ("tela:6", "perfil:3", "material:blackout"…). */
  optionRef: text("option_ref"),
  active: boolean("active").notNull().default(true),
});

/** Zona de servicio: un distrito (o comuna, municipio...) donde hacemos visitas. */
export const serviceZones = pgTable("service_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().default(""),
  status: text("status").notNull().default("nuevo"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  district: text("district").notNull(),
  address: text("address").notNull(),
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
export type Attribute = typeof attributes.$inferSelect;
export type AttributeValue = typeof attributeValues.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type ProductFamily = typeof productFamilies.$inferSelect;
export type ConstraintRule = typeof constraintRules.$inferSelect;
export type Fabric = typeof fabrics.$inferSelect;
export type FrameColor = typeof frameColors.$inferSelect;
export type PriceRule = typeof priceRules.$inferSelect;
export type ServiceZone = typeof serviceZones.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadPhoto = typeof leadPhotos.$inferSelect;
export type LeadNote = typeof leadNotes.$inferSelect;
