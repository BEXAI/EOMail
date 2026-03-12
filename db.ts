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
  ...(process.env.NODE_ENV === "production" ? { ssl: true } : {}),
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export const db = drizzle(pool, { schema });

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
