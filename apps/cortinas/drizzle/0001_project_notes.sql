-- Notas internas por proyecto (solo panel admin).
CREATE TABLE IF NOT EXISTS "project_notes" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "author" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "project_notes_project_idx" ON "project_notes" ("project_id");
