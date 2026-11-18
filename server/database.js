require("dotenv").config();

const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.warn("[DATABASE] DATABASE_URL is not configured.");
}

const pool = new Pool({
    connectionString: databaseUrl,

    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,

    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// ==========================================
// DATABASE EVENTS
// ==========================================

pool.on("connect", () => {
    console.log("[DATABASE] PostgreSQL connection established.");
});

pool.on("error", (error) => {
    console.error("[DATABASE] Pool error:", error.message);
});

// ==========================================
// QUERY
// ==========================================

async function query(text, params = []) {
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error("[DATABASE] Query failed:", error.message);
        throw error;
    }
}

// ==========================================
// TEST CONNECTION
// ==========================================

async function testConnection() {
    if (!databaseUrl) {
        console.warn("[DATABASE] Skipping connection test.");
        return false;
    }

    try {
        const result = await query(
            "SELECT NOW() AS current_time"
        );

        console.log(
            "[DATABASE] Connected successfully:",
            result.rows[0].current_time
        );

        return true;

    } catch (error) {
        console.error(
            "[DATABASE] Connection test failed:",
            error.message
        );

        return false;
    }
}

// ==========================================
// TRANSACTION
// ==========================================

async function transaction(callback) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await callback(client);

        await client.query("COMMIT");

        return result;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

// ==========================================
// CLOSE DATABASE
// ==========================================

async function closeDatabase() {
    await pool.end();

    console.log("[DATABASE] Connection pool closed.");
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
    pool,
    query,
    testConnection,
    transaction,
    closeDatabase
};
