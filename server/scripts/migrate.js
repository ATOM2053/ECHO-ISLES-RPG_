require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    pool,
    testConnection,
    closeDatabase
} = require("../database");

// ==========================================
// ECHO ISLES RPG
// DATABASE MIGRATION
// ==========================================

async function migrate() {
    console.log("--------------------------------");
    console.log("ECHO ISLES RPG DATABASE MIGRATION");
    console.log("--------------------------------");

    try {
        // ตรวจสอบว่ามี DATABASE_URL หรือไม่
        if (!process.env.DATABASE_URL) {
            throw new Error(
                "DATABASE_URL is not configured."
            );
        }

        // ตรวจสอบการเชื่อมต่อ PostgreSQL
        const connected = await testConnection();

        if (!connected) {
            throw new Error(
                "Cannot connect to PostgreSQL."
            );
        }

        // ตำแหน่งไฟล์ schema.sql
        const schemaPath = path.join(
            __dirname,
            "../../database/schema.sql"
        );

        // ตรวจสอบไฟล์
        if (!fs.existsSync(schemaPath)) {
            throw new Error(
                "database/schema.sql was not found."
            );
        }

        // อ่าน SQL
        const sql = fs.readFileSync(
            schemaPath,
            "utf8"
        );

        if (!sql.trim()) {
            throw new Error(
                "schema.sql is empty."
            );
        }

        console.log("[MIGRATION] Installing database schema...");

        // เริ่ม Transaction
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            await client.query(sql);

            await client.query("COMMIT");

            console.log("[MIGRATION] Schema installed successfully.");

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }

        console.log("--------------------------------");
        console.log("DATABASE MIGRATION COMPLETED");
        console.log("--------------------------------");

    } catch (error) {
        console.error(
            "[MIGRATION ERROR]",
            error.message
        );

        process.exitCode = 1;

    } finally {
        await closeDatabase();
    }
}

migrate();
