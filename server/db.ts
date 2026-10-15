import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(process.env.NODE_ENV === "production" ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export const db = drizzle(pool, { schema });

// connect-pg-simple's createTableIfMissing reads a table.sql file next to its own source,
// which does not exist once the server is bundled into dist/, so create the table here.
export async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
}

export async function verifyDatabaseConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      console.log("Database connection verified successfully.");
      return true;
    } catch (err) {
      const delay = Math.min(1000 * Math.pow(2, i), 8000);
      console.warn(`Database connection attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`, (err as Error).message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error("Failed to connect to database after all retries.");
  return false;
}
