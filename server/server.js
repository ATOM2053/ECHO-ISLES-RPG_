require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../client")));

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const players = new Map();

app.get("/api/status", (req, res) => {
    res.json({
        game: "ECHO ISLES RPG",
        status: "online",
        players: players.size,
        version: "0.1.0"
    });
});

io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);

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

    socket.emit("world:init", {
        self: player,
        players: Array.from(players.values())
    });

    socket.broadcast.emit("player:joined", player);

    socket.on("player:move", (data) => {

        const currentPlayer = players.get(socket.id);

        if (!currentPlayer) return;

        const x = Number(data?.x);
        const y = Number(data?.y);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            Math.abs(x - currentPlayer.x) > 100 ||
            Math.abs(y - currentPlayer.y) > 100
        ) {
            return;
        }

        currentPlayer.x = x;
        currentPlayer.y = y;

        if (["up", "down", "left", "right"].includes(data.direction)) {
            currentPlayer.direction = data.direction;
        }

        io.emit("player:moved", currentPlayer);
    });

    socket.on("player:chat", (message) => {

        if (typeof message !== "string") return;

        const text = message.trim().slice(0, 200);

        if (!text) return;

        io.emit("chat:message", {
            playerId: socket.id,
            name: players.get(socket.id)?.name || "Adventurer",
            message: text,
            time: Date.now()
        });
    });

    socket.on("disconnect", () => {

        players.delete(socket.id);

        io.emit("player:left", socket.id);

        console.log("Player disconnected:", socket.id);
    });

});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`ECHO ISLES RPG running on port ${PORT}`);
});
