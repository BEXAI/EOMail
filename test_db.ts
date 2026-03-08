import pg from 'pg';

const connectionString = 'postgresql://eomail_db_user:c5e0OvynjCR5EVrWvW1ZYutHagk7BQRn@dpg-d6malfn5gffc73bao5lg-a.oregon-postgres.render.com/eomail_db';

const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        await client.connect();
        console.log('Successfully connected to Render Postgres!');
        const res = await client.query('SELECT current_database(), current_user, version();');
        console.log('Context:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();
