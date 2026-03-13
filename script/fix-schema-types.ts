/**
 * Pre-migration script: fixes type mismatches before drizzle-kit push.
 *
 * Problem: The original tables were created with uuid columns, but the
 * schema previously used varchar(). When drizzle-kit created new tables
 * it used varchar columns, which can't have FK constraints to uuid PKs.
 *
 * Solution: Drop the empty broken tables so drizzle-kit can recreate
 * them with correct uuid types, and add any missing columns to existing tables.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set, skipping schema fix");
  process.exit(0);
}

async function run() {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    // Check if we need to fix anything by looking at column types
    const { rows } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);

    if (rows.length === 0) {
      console.log("No users table found, skipping schema fix");
      return;
    }

    // Add missing columns to users table (idempotent with IF NOT EXISTS)
    console.log("Adding missing columns to users table...");
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_start text DEFAULT '09:00';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS working_hours_end text DEFAULT '17:00';
    `);
    console.log("Users columns OK");

    // Check if any new tables have varchar id columns (wrong type)
    // These tables should have uuid columns to match users.id and emails.id
    const tablesToFix = [
      "timezone_conflicts",
      "calendar_participants",
      "availability_slots",
      "calendar_events",
      "financial_documents",
      "quarantine_actions",
      "threat_scan_logs",
      "email_threads",
      "user_preferences",
    ];

    for (const table of tablesToFix) {
      const check = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'user_id'
      `, [table]);

      if (check.rows.length > 0 && check.rows[0].data_type === 'character varying') {
        // Check if table is empty before dropping
        const countResult = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        const count = parseInt(countResult.rows[0].cnt, 10);
        if (count === 0) {
          console.log(`Dropping empty table ${table} (has varchar columns, needs uuid)...`);
          await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        } else {
          console.log(`WARNING: ${table} has ${count} rows with varchar columns — skipping drop`);
        }
      } else if (check.rows.length === 0) {
        console.log(`Table ${table} does not exist yet — will be created by drizzle-kit`);
      } else {
        console.log(`Table ${table} already has correct column types`);
      }
    }

    console.log("Schema fix complete — drizzle-kit push will handle the rest");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Schema fix failed:", err.message);
  // Don't exit(1) — let db:push attempt to continue
});
