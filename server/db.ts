import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL must be set. Ensure the database is provisioned.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(process.env.NODE_ENV === "production" ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export const db = drizzle(pool, { schema });

export async function initSchema() {
  if (process.env.DATABASE_URL) {
    try {
      // Look for schema.sql in project root (common in Render/Replit) or local dir
      const sqlPaths = [
        path.resolve(__dirname, "../schema.sql"),
        path.resolve(process.cwd(), "schema.sql")
      ];

      let sqlFile = sqlPaths.find(p => fs.existsSync(p));

      if (sqlFile) {
        const sqlContent = fs.readFileSync(sqlFile, "utf8");
        await pool.query(sqlContent);
        console.log("Database schema initialized successfully from one-shot SQL file.");
      } else {
        console.warn("Schema initialization skipped: schema.sql not found.");
      }
    } catch (err) {
      console.error("Failed to initialize database schema:", err);
    }
  }
}
