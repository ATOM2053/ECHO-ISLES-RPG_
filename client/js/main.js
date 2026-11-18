/* =========================================
   ECHO ISLES RPG
   MAIN GAME CONTROLLER
   Version: 0.4.0
========================================= */

"use strict";

(() => {

    if (!window.GAME_CONFIG) {
        console.error("Game configuration not found!");
        return;
    }

    const GAME = {

        /* =====================================
           GAME STATE
        ===================================== */

        state: {
            initialized: false,
            connected: false,
            playing: false,
            loading: true
        },

        /* =====================================
           PLAYER
        ===================================== */

        player: {
            id: null,
            characterId: null,
            accountId: null,

            name: "Adventurer",
            race: "Human",
            gender: "Male",
            job: "Adventurer",

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

        /* =====================================
           WORLD
        ===================================== */

        world: {
            currentMap: "starting_village",

            players: new Map(),
            monsters: new Map(),
            npcs: new Map()
        },

        /* =====================================
           NETWORK
        ===================================== */

        network: {

            socket: null,

            connect() {

                const token = window.ECHO_AUTH?.getToken();

                if (!token) {
                    console.warn(
                        "Cannot connect: Authentication required."
                    );
                    return null;
                }

                if (typeof window.io !== "function") {
                    console.error("Socket.IO is not loaded.");
                    return null;
                }

                if (this.socket?.connected) {
                    return this.socket;
                }

                if (this.socket) {
                    this.socket.disconnect();
                    this.socket = null;
                }

                const socket = window.io({

                    path: window.GAME_CONFIG.NETWORK.SOCKET_PATH,

                    auth: {
                        token
                    },

                    reconnection:
                        window.GAME_CONFIG.NETWORK.RECONNECT,

                    reconnectionAttempts:
                        window.GAME_CONFIG.NETWORK.RECONNECT_ATTEMPTS,

                    reconnectionDelay:
                        window.GAME_CONFIG.NETWORK.RECONNECT_DELAY

                });

                this.socket = socket;

                /* CONNECTION */

                socket.on("connect", () => {

                    GAME.state.connected = true;

                    console.log(
                        "Connected to ECHO ISLES server:",
                        socket.id
                    );

                });

                /* DISCONNECTION */

                socket.on("disconnect", (reason) => {

                    GAME.state.connected = false;
                    GAME.state.playing = false;

                    console.log(
                        "Disconnected from server:",
                        reason
                    );

                });

                /* CONNECTION ERROR */

                socket.on("connect_error", (error) => {

                    GAME.state.connected = false;

                    console.error(
                        "Socket connection error:",
                        error.message
                    );

                });

                /* WORLD INITIALIZATION */

                socket.on("world:init", (data) => {

                    if (!data) return;

                    if (data.self) {

                        GAME.player = {
                            ...GAME.player,
                            ...data.self
                        };

                        GAME.world.currentMap =
                            data.self.map ||
                            GAME.world.currentMap;

                    }

                    GAME.world.players.clear();

                    if (Array.isArray(data.players)) {

                        data.players.forEach(player => {

                            if (player.id !== GAME.player.id) {

                                GAME.world.players.set(
                                    player.id,
                                    player
                                );

                            }

                        });

                    }

                    GAME.state.playing = true;

                    console.log("Entered game world!");

                });

                /* PLAYER JOINED */

                socket.on("player:joined", (player) => {

                    if (!player || !player.id) return;

                    if (player.id === GAME.player.id) return;

                    GAME.world.players.set(
                        player.id,
                        player
                    );

                    console.log(
                        "Player joined:",
                        player.name
                    );

                });

                /* PLAYER MOVED */

                socket.on("player:moved", (player) => {

                    if (!player || !player.id) return;

                    GAME.world.players.set(
                        player.id,
                        player
                    );

                });

                /* PLAYER LEFT */

                socket.on("player:left", (data) => {

                    const playerId =
                        typeof data === "string"
                            ? data
                            : data?.id;

                    if (!playerId) return;

                    GAME.world.players.delete(playerId);

                });

                return socket;

            },

            /* =================================
               WAIT FOR CONNECTION
            ================================= */

            waitForConnection(timeout = 10000) {

                return new Promise((resolve, reject) => {

                    const socket = this.socket;

                    if (!socket) {
                        reject(
                            new Error("Socket is not initialized.")
                        );
                        return;
                    }

                    if (socket.connected) {
                        resolve(socket);
                        return;
                    }

                    const timer = setTimeout(() => {

                        socket.off("connect", onConnect);

                        reject(
                            new Error("Connection timeout.")
                        );

                    }, timeout);

                    const onConnect = () => {

                        clearTimeout(timer);

                        resolve(socket);

                    };

                    socket.once("connect", onConnect);

                });

            }

        },

        /* =====================================
           ENTER WORLD
        ===================================== */

        async enterWorld(characterId) {

            if (!characterId) {
                throw new Error("กรุณาเลือกตัวละคร");
            }

            if (!window.ECHO_AUTH?.getToken()) {
                throw new Error("กรุณาเข้าสู่ระบบก่อน");
            }

            const socket = this.network.connect();

            if (!socket) {
                throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            }

            await this.network.waitForConnection();

            return new Promise((resolve, reject) => {

                socket.emit(
                    "world:enter",
                    { characterId },
                    (result) => {

                        if (!result || !result.success) {

                            reject(
                                new Error(
                                    result?.message ||
                                    "ไม่สามารถเข้าโลกเกมได้"
                                )
                            );

                            return;

                        }

                        if (result.player) {

                            this.player = {
                                ...this.player,
                                ...result.player
                            };

                        }

                        this.state.playing = true;

                        resolve(result);

                    }
                );

            });

        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init() {

            if (this.state.initialized) return;

            console.log(
                "================================="
            );

            console.log(
                "ECHO ISLES RPG",
                window.GAME_CONFIG.GAME.VERSION
            );

            console.log(
                "Game Controller Initialized"
            );

            console.log(
                "================================="
            );

            this.state.initialized = true;
            this.state.loading = false;

        }

    };

    window.ECHO_GAME = GAME;

    /* =====================================
       DOCUMENT READY
    ===================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => GAME.init()
    );

})();
