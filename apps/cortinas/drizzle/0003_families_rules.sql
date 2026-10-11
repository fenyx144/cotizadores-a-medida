-- Familias (plantillas) de producto, reglas del configurador y recargos condicionados por opción.
CREATE TABLE IF NOT EXISTS "product_families" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "requires_fabric" boolean DEFAULT true NOT NULL,
  "requires_frame" boolean DEFAULT true NOT NULL,
  "requires_drive" boolean DEFAULT true NOT NULL,
  "min_width" integer DEFAULT 40 NOT NULL,
  "max_width" integer DEFAULT 300 NOT NULL,
  "min_height" integer DEFAULT 40 NOT NULL,
  "max_height" integer DEFAULT 320 NOT NULL,
  "allowed_drives" text DEFAULT '' NOT NULL,
  "allowed_frame_ids" text DEFAULT '' NOT NULL,
  "allowed_fabric_ids" text DEFAULT '' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS "constraint_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "family_id" integer,
  "model_id" integer,
  "if_option" text,
  "then_option" text,
  "min_width" integer,
  "max_width" integer,
  "min_height" integer,
  "max_height" integer,
  "message" text DEFAULT '' NOT NULL,
  "active" boolean DEFAULT true NOT NULL
);
ALTER TABLE "product_models" ADD COLUMN IF NOT EXISTS "family_id" integer;
ALTER TABLE "price_rules" ADD COLUMN IF NOT EXISTS "option_ref" text;
