import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Safe path resolution for bundled environment
let projectDir = process.cwd();
try {
  // Check if we are in an ESM environment with import.meta.url
  if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
    const __filename = fileURLToPath(import.meta.url);
    projectDir = path.dirname(path.dirname(__filename));
  } else {
    // Fallback for CJS/Bundled environments
    projectDir = path.resolve(__dirname, "..");
  }
} catch (e) {
  // Broad fallback for any resolution error
  projectDir = path.resolve(__dirname, "..");
}

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL must be set. Ensure the database is provisioned.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_URL?.includes("render.com") || process.env.DATABASE_URL?.includes("oregon-postgres")
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false),
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
        path.resolve(projectDir, "schema.sql"),
        path.resolve(process.cwd(), "schema.sql")
      ];

      let sqlFile = sqlPaths.find(p => fs.existsSync(p));

      if (sqlFile) {
        // Check if users table already exists to avoid redundant execution
        const checkTable = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')`);
        if (checkTable.rows[0].exists) {
          console.log("Database schema already exists. Skipping initialization.");
          return;
        }

        const sqlContent = fs.readFileSync(sqlFile, "utf8");
        await pool.query(sqlContent);
        console.log("Database schema initialized successfully from one-shot SQL file.");
      }
      else {
        console.warn("Schema initialization skipped: schema.sql not found.");
      }
    } catch (err) {
      console.error("Failed to initialize database schema:", err);
    }
  }
}
