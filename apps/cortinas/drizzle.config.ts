// Configuración de drizzle-kit: crea/actualiza las tablas a partir del esquema.
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["../../packages/core/src/db/schema.ts", "../../packages/core/src/db/project-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
