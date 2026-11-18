require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const {
    testConnection,
    closeDatabase
} = require("./database");

const accountRoutes = require("./routes/accountRoutes");
const characterRoutes = require("./routes/characterRoutes");

const app = express();
const server = http.createServer(app);

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "*"
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/account", accountRoutes);
app.use("/api/characters", characterRoutes);

// ==========================================
// SERVE CLIENT
// ==========================================

app.use(express.static(
    path.join(__dirname, "../client")
));

// ==========================================
// SERVER STATUS
// ==========================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        game: "ECHO ISLES RPG",
        version: "0.2.0",
        status: "online",
        database: process.env.DATABASE_URL
            ? "configured"
            : "not_configured",
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

// ==========================================
// ONLINE PLAYERS
// ==========================================

const players = new Map();

// ==========================================
// PLAYER CONNECTION
// ==========================================

io.on("connection", (socket) => {

    console.log(
        `[ONLINE] Player connected: ${socket.id}`
    );

    // --------------------------------------
    // INITIALIZE PLAYER
    // --------------------------------------

    const player = {
        id: socket.id,
        name: "Adventurer",
        x: 400,
        y: 300,
        map: "starting_village"
    };

    players.set(socket.id, player);

    socket.emit("world:init", {
        player,
        players: Array.from(players.values())
    });

    socket.broadcast.emit("player:joined", player);

    // --------------------------------------
    // PLAYER MOVEMENT
    // --------------------------------------

    socket.on("player:move", (data) => {

        if (!data || typeof data !== "object") {
            return;
        }

        const currentPlayer = players.get(socket.id);

        if (!currentPlayer) {
            return;
        }

        const x = Number(data.x);
        const y = Number(data.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }

        // จำกัดระยะการเคลื่อนที่ต่อหนึ่งคำสั่ง
        const dx = x - currentPlayer.x;
        const dy = y - currentPlayer.y;

        const distance = Math.sqrt(
            dx * dx + dy * dy
        );

        if (distance > 100) {
            return;
        }

        currentPlayer.x = x;
        currentPlayer.y = y;

        io.emit("player:moved", {
            id: socket.id,
            x: currentPlayer.x,
            y: currentPlayer.y
        });
    });

    // --------------------------------------
    // PLAYER CHAT
    // --------------------------------------

    socket.on("player:chat", (data) => {

        if (!data || typeof data.message !== "string") {
            return;
        }

        const message = data.message.trim();

        if (!message || message.length > 200) {
            return;
        }

        const currentPlayer = players.get(socket.id);

        if (!currentPlayer) {
            return;
        }

        io.emit("chat:message", {
            id: socket.id,
            name: currentPlayer.name,
            message,
            timestamp: Date.now()
        });
    });

    // --------------------------------------
    // PLAYER DISCONNECT
    // --------------------------------------

    socket.on("disconnect", () => {

        console.log(
            `[OFFLINE] Player disconnected: ${socket.id}`
        );

        players.delete(socket.id);

        io.emit("player:left", {
            id: socket.id
        });
    });

});

// ==========================================
// 404 API HANDLER
// ==========================================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        code: "API_NOT_FOUND",
        message: "ไม่พบ API ที่เรียกใช้งาน"
    });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {

    console.error("[SERVER ERROR]", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(error.status || 500).json({
        success: false,
        message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์"
    });
});

// ==========================================
// START SERVER
// ==========================================

server.listen(PORT, async () => {

    console.log("--------------------------------");
    console.log("ECHO ISLES RPG SERVER");
    console.log("--------------------------------");

    console.log(`[SERVER] Running on port ${PORT}`);

    console.log(
        `[DATABASE] ${
            process.env.DATABASE_URL
                ? "Configured"
                : "Not configured"
        }`
    );

    if (process.env.DATABASE_URL) {
        await testConnection();
    }

    console.log("[SERVER] Ready");
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

let shuttingDown = false;

async function shutdown(signal) {

    if (shuttingDown) return;

    shuttingDown = true;

    console.log(`[SERVER] ${signal} received`);

    io.close();

    server.close(async () => {

        try {
            await closeDatabase();

            console.log("[SERVER] Shutdown complete");

            process.exit(0);

        } catch (error) {

            console.error(
                "[SERVER] Shutdown error:",
                error.message
            );

            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error("[SERVER] Forced shutdown");
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
