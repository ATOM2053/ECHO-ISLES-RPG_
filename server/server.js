/* =========================================
   ECHO ISLES RPG
   MAIN GAME SERVER
   Version: 0.2.0
========================================= */

"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

const { Server } = require("socket.io");

const {
    testConnection
} = require("./database");

const accountRoutes = require("./routes/accountRoutes");

/* =========================================
   EXPRESS SERVER
========================================= */

const app = express();

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "*"
}));

app.use(express.json({
    limit: "20kb"
}));

app.use(express.urlencoded({
    extended: false,
    limit: "20kb"
}));

/* =========================================
   STATIC CLIENT
========================================= */

app.use(
    express.static(
        path.join(__dirname, "../client")
    )
);

/* =========================================
   API ROUTES
========================================= */

app.use("/api/account", accountRoutes);

/* =========================================
   SERVER STATUS
========================================= */

app.get("/api/status", (req, res) => {

    res.json({

        game: "ECHO ISLES RPG",

        status: "online",

        players: players.size,

        version: "0.2.0",

        database: process.env.DATABASE_URL
            ? "configured"
            : "not_configured"

    });

});

/* =========================================
   SOCKET.IO
========================================= */

const io = new Server(server, {

    cors: {
        origin: process.env.CLIENT_ORIGIN || "*",
        methods: ["GET", "POST"]
    },

    pingInterval: 25000,

    pingTimeout: 20000

});

/* =========================================
   PLAYER STORAGE
========================================= */

const players = new Map();

/* =========================================
   SOCKET CONNECTION
========================================= */

io.on("connection", (socket) => {

    console.log(
        "[GAME] Player connected:",
        socket.id
    );

    const player = {

        id: socket.id,

        name: "Adventurer",

        x: 400,

        y: 300,

        direction: "down",

        level: 1,

        hp: 100,

        mp: 100,

        map: "starting_village"

    };

    players.set(socket.id, player);

    /* INITIAL WORLD DATA */

    socket.emit("world:init", {

        self: player,

        players: Array.from(
            players.values()
        )

    });

    socket.broadcast.emit(
        "player:joined",
        player
    );

    /* =================================
       PLAYER MOVEMENT
    ================================= */

    socket.on("player:move", (data) => {

        const currentPlayer = players.get(
            socket.id
        );

        if (!currentPlayer || !data) return;

        const x = Number(data.x);
        const y = Number(data.y);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return;
        }

        if (
            Math.abs(x - currentPlayer.x) > 100 ||
            Math.abs(y - currentPlayer.y) > 100
        ) {
            return;
        }

        currentPlayer.x = x;
        currentPlayer.y = y;

        if (
            ["up", "down", "left", "right"]
                .includes(data.direction)
        ) {
            currentPlayer.direction = data.direction;
        }

        io.emit(
            "player:moved",
            currentPlayer
        );

    });

    /* =================================
       LEGACY CHAT
    ================================= */

    socket.on("player:chat", (message) => {

        if (typeof message !== "string") return;

        const text = message.trim().slice(0, 200);

        if (!text) return;

        io.emit("chat:message", {

            playerId: socket.id,

            name: players.get(socket.id)?.name ||
                "Adventurer",

            message: text,

            time: Date.now()

        });

    });

    /* =================================
       DISCONNECT
    ================================= */

    socket.on("disconnect", () => {

        players.delete(socket.id);

        io.emit(
            "player:left",
            socket.id
        );

        console.log(
            "[GAME] Player disconnected:",
            socket.id
        );

    });

});

/* =========================================
   START SERVER
========================================= */

server.listen(PORT, "0.0.0.0", async () => {

    console.log("--------------------------------");

    console.log(" ECHO ISLES RPG SERVER");

    console.log("--------------------------------");

    console.log("Port:", PORT);

    console.log("Environment:", process.env.NODE_ENV || "development");

    console.log("Account API: /api/account");

    console.log("Game Socket: enabled");

    console.log("--------------------------------");

    if (process.env.DATABASE_URL) {

        await testConnection();

    } else {

        console.warn(
            "[DATABASE] Waiting for PostgreSQL configuration."
        );

    }

});

/* =========================================
   GRACEFUL SHUTDOWN
========================================= */

async function shutdown() {

    console.log("[SERVER] Shutting down...");

    io.close();

    server.close(async () => {

        try {

            const { closeDatabase } = require("./database");

            await closeDatabase();

        } catch (error) {

            console.error(
                "[SERVER] Database shutdown error:",
                error.message
            );

        }

        process.exit(0);

    });

}

process.on("SIGTERM", shutdown);

process.on("SIGINT", shutdown);
