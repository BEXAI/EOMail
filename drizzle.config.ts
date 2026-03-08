import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
    ssl: process.env.DATABASE_URL?.includes("render.com") || process.env.DATABASE_URL?.includes("oregon-postgres")
      ? { rejectUnauthorized: false }
      : false,
  },
});
