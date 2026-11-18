/* =========================================
   ECHO ISLES RPG
   MAIN GAME CONTROLLER
   Version: 0.5.0
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
           MOVEMENT SETTINGS
        ===================================== */

        movement: {

            speed: 180,

            keyboard: {
                x: 0,
                y: 0
            },

            joystick: {
                x: 0,
                y: 0
            },

            lastDirection: "down",

            lastUpdate: 0,
            lastNetworkUpdate: 0,

            animationFrame: null,

            joystickActive: false,

            keys: new Set()

        },

        /* =====================================
           NETWORK
        ===================================== */

        network: {

            socket: null,

            connect() {

                const token = window.ECHO_AUTH?.getToken();

                if (!token) {
                    console.warn("Authentication required.");
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

                    console.log("Connected:", socket.id);

                });

                /* DISCONNECTION */

                socket.on("disconnect", reason => {

                    GAME.state.connected = false;
                    GAME.state.playing = false;

                    GAME.movement.stop();

                    console.log("Disconnected:", reason);

                });

                /* CONNECTION ERROR */

                socket.on("connect_error", error => {

                    GAME.state.connected = false;

                    console.error(
                        "Connection error:",
                        error.message
                    );

                });

                /* WORLD INITIALIZATION */

                socket.on("world:init", data => {

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

                    GAME.movement.start();

                    console.log("Entered game world!");

                });

                /* PLAYER JOINED */

                socket.on("player:joined", player => {

                    if (!player?.id) return;

                    if (player.id === GAME.player.id) return;

                    GAME.world.players.set(
                        player.id,
                        player
                    );

                });

                /* PLAYER MOVED */

                socket.on("player:moved", player => {

                    if (!player?.id) return;

                    if (player.id === GAME.player.id) {

                        GAME.player = {
                            ...GAME.player,
                            ...player
                        };

                        return;

                    }

                    GAME.world.players.set(
                        player.id,
                        player
                    );

                });

                /* PLAYER LEFT */

                socket.on("player:left", data => {

                    const playerId =
                        typeof data === "string"
                            ? data
                            : data?.id;

                    if (!playerId) return;

                    GAME.world.players.delete(playerId);

                });

                return socket;

            },

            /* WAIT FOR CONNECTION */

            waitForConnection(timeout = 10000) {

                return new Promise((resolve, reject) => {

                    const socket = this.socket;

                    if (!socket) {
                        reject(new Error("Socket not initialized."));
                        return;
                    }

                    if (socket.connected) {
                        resolve(socket);
                        return;
                    }

                    const timer = setTimeout(() => {

                        socket.off("connect", onConnect);

                        reject(new Error("Connection timeout."));

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
           MOVEMENT SYSTEM
        ===================================== */

        movement: {

            speed: 180,

            keyboard: {
                x: 0,
                y: 0
            },

            joystick: {
                x: 0,
                y: 0
            },

            lastDirection: "down",
            lastUpdate: 0,
            lastNetworkUpdate: 0,
            animationFrame: null,
            joystickActive: false,
            keys: new Set(),

            start() {

                if (this.animationFrame !== null) return;

                this.lastUpdate = performance.now();

                this.animationFrame =
                    requestAnimationFrame(time => this.update(time));

            },

            stop() {

                if (this.animationFrame !== null) {

                    cancelAnimationFrame(this.animationFrame);

                    this.animationFrame = null;

                }

                this.keys.clear();

                this.keyboard.x = 0;
                this.keyboard.y = 0;

                this.joystick.x = 0;
                this.joystick.y = 0;

                this.joystickActive = false;

            },

            setJoystick(x, y) {

                this.joystick.x = Math.max(-1, Math.min(1, x));

                this.joystick.y = Math.max(-1, Math.min(1, y));

                this.joystickActive =
                    Math.abs(x) > 0.05 ||
                    Math.abs(y) > 0.05;

            },

            updateKeyboard() {

                let x = 0;
                let y = 0;

                if (
                    this.keys.has("a") ||
                    this.keys.has("arrowleft")
                ) {
                    x -= 1;
                }

                if (
                    this.keys.has("d") ||
                    this.keys.has("arrowright")
                ) {
                    x += 1;
                }

                if (
                    this.keys.has("w") ||
                    this.keys.has("arrowup")
                ) {
                    y -= 1;
                }

                if (
                    this.keys.has("s") ||
                    this.keys.has("arrowdown")
                ) {
                    y += 1;
                }

                this.keyboard.x = x;
                this.keyboard.y = y;

            },

            update(time) {

                if (!GAME.state.playing) {

                    this.animationFrame = null;

                    return;

                }

                const deltaTime = Math.min(
                    (time - this.lastUpdate) / 1000,
                    0.05
                );

                this.lastUpdate = time;

                this.updateKeyboard();

                let x =
                    this.keyboard.x +
                    this.joystick.x;

                let y =
                    this.keyboard.y +
                    this.joystick.y;

                const length = Math.hypot(x, y);

                if (length > 1) {

                    x /= length;
                    y /= length;

                }

                if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {

                    GAME.player.x +=
                        x * this.speed * deltaTime;

                    GAME.player.y +=
                        y * this.speed * deltaTime;

                    GAME.player.x = Math.max(
                        0,
                        Math.min(10000, GAME.player.x)
                    );

                    GAME.player.y = Math.max(
                        0,
                        Math.min(10000, GAME.player.y)
                    );

                    if (Math.abs(x) > Math.abs(y)) {

                        this.lastDirection =
                            x > 0 ? "right" : "left";

                    } else {

                        this.lastDirection =
                            y > 0 ? "down" : "up";

                    }

                    GAME.player.direction =
                        this.lastDirection;

                    if (window.ECHO_RENDERER) {

                        window.ECHO_RENDERER.updatePlayer({

                            x: GAME.player.x,
                            y: GAME.player.y,
                            name: GAME.player.name

                        });

                    }

                    if (time - this.lastNetworkUpdate >= 100) {

                        this.sendPosition();

                        this.lastNetworkUpdate = time;

                    }

                }

                this.animationFrame =
                    requestAnimationFrame(nextTime =>
                        this.update(nextTime)
                    );

            },

            sendPosition() {

                const socket = GAME.network.socket;

                if (!socket?.connected) return;

                socket.emit("player:move", {

                    x: GAME.player.x,
                    y: GAME.player.y,
                    direction: GAME.player.direction

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
                    result => {

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

                        this.movement.start();

                        resolve(result);

                    }
                );

            });

        },

        /* =====================================
           KEYBOARD INPUT
        ===================================== */

        initKeyboard() {

            document.addEventListener("keydown", event => {

                const key = event.key.toLowerCase();

                const movementKeys = [
                    "w",
                    "a",
                    "s",
                    "d",
                    "arrowup",
                    "arrowdown",
                    "arrowleft",
                    "arrowright"
                ];

                if (!movementKeys.includes(key)) return;

                if (!GAME.state.playing) return;

                if (
                    event.target instanceof HTMLInputElement ||
                    event.target instanceof HTMLTextAreaElement
                ) {
                    return;
                }

                event.preventDefault();

                GAME.movement.keys.add(key);

            });

            document.addEventListener("keyup", event => {

                GAME.movement.keys.delete(
                    event.key.toLowerCase()
                );

            });

            window.addEventListener("blur", () => {

                GAME.movement.keys.clear();

                GAME.movement.keyboard.x = 0;
                GAME.movement.keyboard.y = 0;

            });

        },

        /* =====================================
           MOBILE JOYSTICK
        ===================================== */

        initJoystick() {

            if (document.getElementById("mobile-joystick")) {
                return;
            }

            const style = document.createElement("style");

            style.textContent = `

                #mobile-joystick {

                    position: absolute;

                    left: 24px;
                    bottom: 24px;

                    width: 132px;
                    height: 132px;

                    border-radius: 50%;

                    background: rgba(20, 30, 35, 0.55);

                    border: 2px solid rgba(255,255,255,0.35);

                    display: none;

                    align-items: center;
                    justify-content: center;

                    touch-action: none;

                    z-index: 200;

                    user-select: none;
                    -webkit-user-select: none;

                }

                #mobile-joystick.active {
                    display: flex;
                }

                #mobile-joystick-knob {

                    width: 52px;
                    height: 52px;

                    border-radius: 50%;

                    background: rgba(220, 200, 155, 0.85);

                    border: 2px solid #fff0c8;

                    box-shadow: 0 3px 10px rgba(0,0,0,0.4);

                    transform: translate(0, 0);

                    pointer-events: none;

                }

                @media (pointer: coarse) {

                    #mobile-joystick.active {
                        display: flex;
                    }

                }

            `;

            document.head.appendChild(style);

            const gameScreen =
                document.getElementById("game-screen");

            const joystick = document.createElement("div");

            joystick.id = "mobile-joystick";

            const knob = document.createElement("div");

            knob.id = "mobile-joystick-knob";

            joystick.appendChild(knob);

            gameScreen.appendChild(joystick);

            const radius = 40;

            let pointerId = null;

            function moveJoystick(event) {

                const rect = joystick.getBoundingClientRect();

                const centerX =
                    rect.left + rect.width / 2;

                const centerY =
                    rect.top + rect.height / 2;

                let dx = event.clientX - centerX;
                let dy = event.clientY - centerY;

                const distance = Math.hypot(dx, dy);

                if (distance > radius) {

                    dx = dx / distance * radius;
                    dy = dy / distance * radius;

                }

                knob.style.transform =
                    `translate(${dx}px, ${dy}px)`;

                GAME.movement.setJoystick(
                    dx / radius,
                    dy / radius
                );

            }

            function releaseJoystick() {

                pointerId = null;

                joystick.classList.remove("pressed");

                knob.style.transform = "translate(0, 0)";

                GAME.movement.setJoystick(0, 0);

            }

            joystick.addEventListener("pointerdown", event => {

                if (!GAME.state.playing) return;

                event.preventDefault();

                pointerId = event.pointerId;

                joystick.setPointerCapture(pointerId);

                moveJoystick(event);

            });

            joystick.addEventListener("pointermove", event => {

                if (event.pointerId !== pointerId) return;

                event.preventDefault();

                moveJoystick(event);

            });

            joystick.addEventListener("pointerup", event => {

                if (event.pointerId !== pointerId) return;

                releaseJoystick();

            });

            joystick.addEventListener("pointercancel", releaseJoystick);

            joystick.addEventListener("lostpointercapture", releaseJoystick);

            this.joystickElement = joystick;

        },

        showJoystick() {

            if (!this.joystickElement) return;

            this.joystickElement.classList.add("active");

        },

        hideJoystick() {

            if (!this.joystickElement) return;

            this.joystickElement.classList.remove("active");

            this.movement.setJoystick(0, 0);

        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init() {

            if (this.state.initialized) return;

            console.log("=================================");
            console.log("ECHO ISLES RPG", window.GAME_CONFIG.GAME.VERSION);
            console.log("Game Controller Initialized");
            console.log("=================================");

            this.initKeyboard();

            this.initJoystick();

            this.state.initialized = true;

            this.state.loading = false;

        }

    };

    window.ECHO_GAME = GAME;

    /* =====================================
       DOCUMENT READY
    ===================================== */

    document.addEventListener("DOMContentLoaded", () => {

        GAME.init();

        document.addEventListener("echo:world-entered", () => {

            GAME.showJoystick();

            if (window.ECHO_RENDERER) {

                window.ECHO_RENDERER.updatePlayer({

                    x: GAME.player.x,
                    y: GAME.player.y,
                    name: GAME.player.name

                });

                window.ECHO_RENDERER.start();

            }

        });

        document.getElementById("leave-world")
            ?.addEventListener("click", () => {

                GAME.hideJoystick();

                GAME.movement.stop();

            });

    });

})();
