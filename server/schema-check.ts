import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@shared/schema";
import { pool } from "./db";

/**
 * Read-only startup check: compares every table/column declared in shared/schema.ts
 * against the live database and logs anything missing. Never modifies the database.
 */
export async function checkSchema(): Promise<{ ok: boolean; missing: string[] }> {
  const expected = new Map<string, string[]>();
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      const config = getTableConfig(value);
      expected.set(config.name, config.columns.map((c) => c.name));
    }
  }
  expected.set("session", ["sid", "sess", "expire"]);

  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
  );
  const actual = new Map<string, Set<string>>();
  for (const { table_name, column_name } of rows) {
    if (!actual.has(table_name)) actual.set(table_name, new Set());
    actual.get(table_name)!.add(column_name);
  }

  const missing: string[] = [];
  for (const [table, columns] of expected) {
    const present = actual.get(table);
    if (!present) {
      missing.push(`table ${table}`);
      continue;
    }
    for (const column of columns) {
      if (!present.has(column)) missing.push(`column ${table}.${column}`);
    }
  }

  if (missing.length === 0) {
    console.log(`[schema] OK: all ${expected.size} tables and their columns are present`);
  } else {
    console.error(`[schema] MISSING ${missing.length}: ${missing.join(", ")}. Run \`npm run db:push\`.`);
  }
  return { ok: missing.length === 0, missing };
}
