/* =========================================
   ECHO ISLES RPG
   GAME SERVER
   Version: 0.5.0
   SERVER MOVEMENT VALIDATION
========================================= */

"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const {
    query,
    testConnection,
    closeDatabase
} = require("./database");

const TokenService = require("./services/TokenService");
const CharacterService = require("./services/CharacterService");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURATION
// ==========================================

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "*"
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/account", require("./routes/accountRoutes"));
app.use("/api/characters", require("./routes/characterRoutes"));

// ==========================================
// CLIENT
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
        version: "0.5.0",
        status: "online",
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
// MOVEMENT CONFIGURATION
// ==========================================

const MOVEMENT = {

    // Starting Village: 1672 x 941

    minX: 0,
    minY: 0,

    maxX: 1672,
    maxY: 941,

    // Maximum legitimate movement speed.
    // Client movement speed is currently 180.

    maxSpeed: 240,

    // Small allowance for network timing variation.

    distanceTolerance: 12,

    // Maximum elapsed time used in speed calculation.

    maxElapsedTime: 2000,

    directions: [
        "up",
        "down",
        "left",
        "right"
    ]

};

// ==========================================
// POSITION VALIDATION
// ==========================================

function isValidPosition(x, y) {

    return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= MOVEMENT.minX &&
        y >= MOVEMENT.minY &&
        x <= MOVEMENT.maxX &&
        y <= MOVEMENT.maxY
    );

}

// ==========================================
// MOVEMENT SPEED VALIDATION
// ==========================================

function canPlayerMove(player, x, y, now) {

    const dx = x - player.x;
    const dy = y - player.y;

    const distance = Math.hypot(dx, dy);

    const elapsed = Math.min(
        Math.max(now - player.lastMoveAt, 0),
        MOVEMENT.maxElapsedTime
    );

    const allowedDistance =
        MOVEMENT.maxSpeed * (elapsed / 1000) +
        MOVEMENT.distanceTolerance;

    return distance <= allowedDistance;

}

// ==========================================
// SOCKET AUTHENTICATION
// ==========================================

io.use(async (socket, next) => {

    try {

        const token =
            socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("TOKEN_REQUIRED"));
        }

        const tokenData =
            TokenService.verifyToken(token);

        if (!tokenData) {
            return next(new Error("INVALID_TOKEN"));
        }

        const result = await query(
            `
            SELECT
                id,
                username,
                is_banned
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [tokenData.accountId]
        );

        if (!result.rows.length) {
            return next(new Error("ACCOUNT_NOT_FOUND"));
        }

        const account = result.rows[0];

        if (account.is_banned) {
            return next(new Error("ACCOUNT_BANNED"));
        }

        socket.account = {
            id: account.id,
            username: account.username
        };

        next();

    } catch (error) {

        console.error(
            "[SOCKET AUTH]",
            error.message
        );

        next(new Error("AUTHENTICATION_ERROR"));

    }

});

// ==========================================
// PLAYER CONNECTION
// ==========================================

io.on("connection", (socket) => {

    console.log(
        `[CONNECTED] ${socket.account.username}`
    );

    let activePlayer = null;

    // ======================================
    // ENTER WORLD
    // ======================================

    socket.on("world:enter", async (data, callback) => {

        const respond = typeof callback === "function"
            ? callback
            : () => {};

        try {

            if (activePlayer) {
                return respond({
                    success: false,
                    message: "ALREADY_IN_WORLD"
                });
            }

            const characterId = data?.characterId;

            if (
                typeof characterId !== "string" ||
                characterId.length > 100
            ) {
                return respond({
                    success: false,
                    message: "INVALID_CHARACTER_ID"
                });
            }

            const character =
                await CharacterService.getCharacter(
                    socket.account.id,
                    characterId
                );

            if (!character) {
                return respond({
                    success: false,
                    message: "CHARACTER_NOT_FOUND"
                });
            }

            // LOAD CHARACTER POSITION

            let x = Number(character.position_x);
            let y = Number(character.position_y);

            if (!Number.isFinite(x)) {
                x = 400;
            }

            if (!Number.isFinite(y)) {
                y = 300;
            }

            // Keep position inside the map.

            x = Math.max(
                MOVEMENT.minX,
                Math.min(MOVEMENT.maxX, x)
            );

            y = Math.max(
                MOVEMENT.minY,
                Math.min(MOVEMENT.maxY, y)
            );

            const player = {

                id: socket.id,

                characterId: character.id,
                accountId: socket.account.id,

                name: character.name,
                race: character.race,
                gender: character.gender,
                job: character.job,

                level: character.level,
                hp: character.hp,
                mp: character.mp,
                gold: character.gold,

                x,
                y,

                map: character.map_id || "starting_village",

                direction: "down",
                moving: false,

                // Movement validation timestamp.

                lastMoveAt: Date.now()

            };

            activePlayer = player;

            players.set(socket.id, player);

            socket.join(player.map);

            const remotePlayers =
                Array.from(players.values())
                    .filter(item =>
                        item.map === player.map &&
                        item.id !== socket.id
                    )
                    .map(item => ({
                        ...item,
                        lastMoveAt: undefined
                    }));

            // SEND WORLD DATA

            respond({
                success: true,
                player,
                players: remotePlayers
            });

            socket.emit("world:init", {
                self: player,
                players: remotePlayers
            });

            // NOTIFY OTHER PLAYERS

            socket.to(player.map).emit(
                "player:joined",
                {
                    ...player,
                    lastMoveAt: undefined
                }
            );

            console.log(
                `[WORLD] ${player.name} entered ${player.map}`
            );

        } catch (error) {

            console.error(
                "[WORLD ENTER]",
                error.message
            );

            respond({
                success: false,
                message: "WORLD_ENTRY_FAILED"
            });

        }

    });

    // ======================================
    // PLAYER MOVEMENT
    // ======================================

    socket.on("player:move", (data) => {

        if (!activePlayer || !data) {
            return;
        }

        // POSITION

        const x = Number(data.x);
        const y = Number(data.y);

        if (!isValidPosition(x, y)) {
            return;
        }

        // DIRECTION

        const direction =
            MOVEMENT.directions.includes(data.direction)
                ? data.direction
                : activePlayer.direction;

        // MOVING STATE

        if (typeof data.moving !== "boolean") {
            return;
        }

        const moving = data.moving;

        // MOVEMENT SPEED VALIDATION

        const now = Date.now();

        if (
            !canPlayerMove(
                activePlayer,
                x,
                y,
                now
            )
        ) {

            console.warn(
                `[MOVEMENT BLOCKED] ${activePlayer.name}`
            );

            return;

        }

        // ==================================
        // UPDATE AUTHORITATIVE POSITION
        // ==================================

        activePlayer.x = x;
        activePlayer.y = y;

        activePlayer.direction = direction;
        activePlayer.moving = moving;

        activePlayer.lastMoveAt = now;

        // ==================================
        // BROADCAST TO MAP PLAYERS
        // ==================================

        io.to(activePlayer.map).emit(
            "player:moved",
            {

                id: socket.id,

                x: activePlayer.x,
                y: activePlayer.y,

                direction: activePlayer.direction,
                moving: activePlayer.moving

            }
        );

    });

    // ======================================
    // PLAYER CHAT
    // ======================================

    function handlePlayerChat(data) {

        if (!activePlayer) {
            return;
        }

        if (
            !data ||
            typeof data.message !== "string"
        ) {
            return;
        }

        const message = data.message.trim();

        if (
            !message ||
            message.length > 200
        ) {
            return;
        }

        io.to(activePlayer.map).emit(
            "chat:message",
            {

                id: socket.id,

                name: activePlayer.name,

                message,

                timestamp: Date.now()

            }
        );

    }

    socket.on("player:chat", handlePlayerChat);

    socket.on("chat:send", handlePlayerChat);

    // ======================================
    // PLAYER DISCONNECT
    // ======================================

    socket.on("disconnect", async () => {

        console.log(
            `[DISCONNECTED] ${socket.account.username}`
        );

        if (!activePlayer) {
            return;
        }

        const player = activePlayer;

        players.delete(socket.id);

        try {

            await query(
                `
                UPDATE characters
                SET
                    position_x = $1,
                    position_y = $2,
                    map_id = $3
                WHERE id = $4
                  AND user_id = $5
                `,
                [
                    player.x,
                    player.y,
                    player.map,
                    player.characterId,
                    player.accountId
                ]
            );

        } catch (error) {

            console.error(
                "[SAVE PLAYER POSITION]",
                error.message
            );

        }

        socket.to(player.map).emit(
            "player:left",
            {
                id: socket.id
            }
        );

    });

});

// ==========================================
// API 404
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

    console.log(`[SERVER] Port: ${PORT}`);

    try {

        if (process.env.DATABASE_URL) {

            await testConnection();

            console.log("[DATABASE] Connected");

        } else {

            console.error(
                "[DATABASE] DATABASE_URL missing"
            );

        }

    } catch (error) {

        console.error(
            "[DATABASE ERROR]",
            error.message
        );

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

            console.log(
                "[SERVER] Shutdown complete"
            );

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
