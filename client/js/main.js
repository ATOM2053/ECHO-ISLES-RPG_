/* =========================================
   ECHO ISLES RPG
   Main Game Controller
========================================= */

(() => {
    "use strict";

    // ตรวจสอบการตั้งค่าเกม
    if (!window.GAME_CONFIG) {
        console.error("Game configuration not found!");
        return;
    }

    // สร้างพื้นที่หลักของระบบเกม
    window.ECHO_GAME = {

        // สถานะเกม
        state: {
            initialized: false,
            connected: false,
            playing: false,
            loading: true
        },

        // ข้อมูลผู้เล่น
        player: {
            id: null,
            name: "Adventurer",
            race: "Human",
            gender: "Male",

            level: 1,
            experience: 0,

            hp: 100,
            maxHp: 100,

            mp: 100,
            maxMp: 100,

            gold: 100,

            x: 400,
            y: 300,

            direction: "down",
            map: "starting_village"
        },

        // ข้อมูลโลก
        world: {
            currentMap: "starting_village",
            players: new Map(),
            monsters: new Map(),
            npcs: new Map()
        },

        // ระบบออนไลน์
        network: {
            socket: null,

            connect() {
                if (typeof window.io !== "function") {
                    console.error("Socket.IO is not loaded.");
                    return;
                }

                if (this.socket?.connected) {
                    return;
                }

                this.socket = window.io({
                    path: window.GAME_CONFIG.NETWORK.SOCKET_PATH,
                    reconnection: window.GAME_CONFIG.NETWORK.RECONNECT,
                    reconnectionAttempts:
                        window.GAME_CONFIG.NETWORK.RECONNECT_ATTEMPTS,
                    reconnectionDelay:
                        window.GAME_CONFIG.NETWORK.RECONNECT_DELAY
                });

                this.socket.on("connect", () => {
                    window.ECHO_GAME.state.connected = true;

                    console.log(
                        "Connected to ECHO ISLES server:",
                        this.socket.id
                    );
                });

                this.socket.on("disconnect", () => {
                    window.ECHO_GAME.state.connected = false;

                    console.log("Disconnected from game server.");
                });

                this.socket.on("connect_error", (error) => {
                    console.error("Connection error:", error.message);
                });

                this.socket.on("world:init", (data) => {
                    if (!data) return;

                    window.ECHO_GAME.player = {
                        ...window.ECHO_GAME.player,
                        ...data.self
                    };

                    window.ECHO_GAME.world.players.clear();

                    for (const player of data.players || []) {
                        window.ECHO_GAME.world.players.set(
                            player.id,
                            player
                        );
                    }

                    console.log("World data received.");
                });

                this.socket.on("player:joined", (player) => {
                    if (!player?.id) return;

                    window.ECHO_GAME.world.players.set(
                        player.id,
                        player
                    );
                });

                this.socket.on("player:moved", (player) => {
                    if (!player?.id) return;

                    window.ECHO_GAME.world.players.set(
                        player.id,
                        player
                    );
                });

                this.socket.on("player:left", (playerId) => {
                    window.ECHO_GAME.world.players.delete(playerId);
                });
            }
        },

        // เริ่มต้นเกม
        init() {
            if (this.state.initialized) return;

            console.log("--------------------------------");
            console.log("ECHO ISLES RPG");
            console.log("Version:", GAME_CONFIG.GAME.VERSION);
            console.log("Initializing game...");
            console.log("--------------------------------");

            this.state.initialized = true;
            this.state.loading = false;

            console.log("Game core initialized.");
        }
    };

    // เริ่มต้นระบบเมื่อหน้าเว็บโหลดเสร็จ
    document.addEventListener("DOMContentLoaded", () => {
        window.ECHO_GAME.init();
    });

})();
