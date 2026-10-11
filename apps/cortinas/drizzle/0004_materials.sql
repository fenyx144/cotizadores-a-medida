-- Materiales editables desde el panel.
CREATE TABLE IF NOT EXISTS "materials" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL
);
INSERT INTO "materials" ("slug","name","description","sort_order") VALUES
  ('screen','Screen','Tejido técnico que filtra el sol y mantiene la vista al exterior.',1),
  ('blackout','Blackout','Oscurecimiento total.',2),
  ('mixto','Mixto (día/noche)','Franjas opacas y traslúcidas.',3),
  ('pvc','PVC','Lamas rígidas y lavables.',4),
  ('aluminio','Aluminio','Lamas metálicas lacadas.',5)
ON CONFLICT ("slug") DO NOTHING;
