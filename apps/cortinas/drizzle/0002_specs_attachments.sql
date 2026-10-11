-- Ficha técnica por producto, adjuntos de proyecto y respaldo de archivos en Postgres.
ALTER TABLE "product_models" ADD COLUMN IF NOT EXISTS "specs" jsonb DEFAULT '[]'::jsonb NOT NULL;
CREATE TABLE IF NOT EXISTS "project_attachments" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "storage_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "project_attachments_project_idx" ON "project_attachments" ("project_id");
CREATE TABLE IF NOT EXISTS "stored_files" (
  "key" text PRIMARY KEY NOT NULL,
  "content_type" text NOT NULL,
  "data" bytea NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
UPDATE "product_models" SET "specs" = '[{"label":"Tejido","value":"Screen 5% apertura, poliéster recubierto de PVC"},{"label":"Factor de apertura","value":"5 % (visión al exterior, control solar)"},{"label":"Mecanismo","value":"Cadena con freno y tubo de aluminio 38 mm"},{"label":"Ancho máx.","value":"3,00 m en una sola pieza"},{"label":"Resistencia al fuego","value":"M1 / NFPA 701"},{"label":"Peso/m²","value":"420 g/m²"},{"label":"Garantía","value":"3 años en tejido y mecanismo"}]' WHERE "slug" = 'roller-screen';
UPDATE "product_models" SET "specs" = '[{"label":"Tejido","value":"Blackout 100 % con triple capa acrílica"},{"label":"Oscurecimiento","value":"Total (aulas audiovisuales, salas de proyección)"},{"label":"Mecanismo","value":"Cadena con freno o motor tubular 230 V"},{"label":"Ancho máx.","value":"2,80 m en una sola pieza"},{"label":"Resistencia al fuego","value":"M1 / B1"},{"label":"Peso/m²","value":"480 g/m²"},{"label":"Garantía","value":"3 años"}]' WHERE "slug" = 'roller-blackout';
UPDATE "product_models" SET "specs" = '[{"label":"Tejido","value":"Franjas alternas opacas y traslúcidas (zebra)"},{"label":"Regulación","value":"Luz graduable sin subir la cortina"},{"label":"Mecanismo","value":"Cadena con freno, cofre de aluminio de 80 mm"},{"label":"Ancho máx.","value":"2,50 m"},{"label":"Resistencia al fuego","value":"B1"},{"label":"Peso/m²","value":"310 g/m²"},{"label":"Garantía","value":"2 años"}]' WHERE "slug" = 'doble-roller';
UPDATE "product_models" SET "specs" = '[{"label":"Lamas","value":"PVC rígido de 89 mm, lavable"},{"label":"Apertura","value":"Lateral, central o a un lado; giro de 180°"},{"label":"Mecanismo","value":"Riel de aluminio con cordón y cadena"},{"label":"Alto máx.","value":"3,50 m"},{"label":"Uso recomendado","value":"Clínicas y zonas de limpieza frecuente"},{"label":"Peso/m²","value":"650 g/m²"},{"label":"Garantía","value":"2 años"}]' WHERE "slug" = 'vertical-pvc';
UPDATE "product_models" SET "specs" = '[{"label":"Tejido","value":"Screen 3 % de alta tenacidad"},{"label":"Apertura máx.","value":"4,50 m de ancho × 4,00 m de alto"},{"label":"Mecanismo","value":"Tubo de 63 mm con motor y final de carrera"},{"label":"Control","value":"Mando, pulsador o domótica (opcional)"},{"label":"Resistencia al fuego","value":"M1 / NFPA 701"},{"label":"Peso/m²","value":"450 g/m²"},{"label":"Garantía","value":"5 años en motor, 3 en tejido"}]' WHERE "slug" = 'roller-gran-formato';
UPDATE "product_models" SET "specs" = '[{"label":"Lamas","value":"Aluminio lacado de 25 mm, 0,18 mm de espesor"},{"label":"Regulación","value":"Orientación con varilla e izado con cordón"},{"label":"Cabezal","value":"Perfil de acero galvanizado 25 × 25 mm"},{"label":"Ancho máx.","value":"2,40 m"},{"label":"Acabados","value":"Lacado al horno, colores RAL"},{"label":"Peso/m²","value":"1,1 kg/m²"},{"label":"Garantía","value":"3 años"}]' WHERE "slug" = 'persiana-aluminio';
