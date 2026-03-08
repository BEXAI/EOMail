import { initSchema, pool } from "../server/db.js";

async function run() {
    try {
        await initSchema();
        console.log("Initializer complete.");
    } catch (err) {
        console.error("Initializer failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
