/* =========================================
   ECHO ISLES RPG
   MAIN GAME CONTROLLER
   Version: 1.0.0
   MOVEMENT FIX & COLLISION TEST
========================================= */

"use strict";

(() => {

    if (!window.GAME_CONFIG) {
        console.error("Game configuration not found!");
        return;
    }

    const GAME = {

        // ==================================
        // GAME STATE
        // ==================================

        state: {
            initialized: false,
            connected: false,
            playing: false,
            loading: true
        },

        // ==================================
        // PLAYER
        // ==================================

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
            moving: false,

            map: "starting_village"
        },

        // ==================================
        // WORLD
        // ==================================

        world: {
            currentMap: "starting_village",
            players: new Map(),
            monsters: new Map(),
            npcs: new Map()
        },

        // ==================================
        // NETWORK
        // ==================================

        network: {

            socket: null,

            connect() {

                const token =
                    window.ECHO_AUTH?.getToken();

                if (!token) {
                    throw new Error("AUTHENTICATION_REQUIRED");
                }

                if (typeof window.io !== "function") {
                    throw new Error("SOCKET_IO_NOT_LOADED");
                }

                if (this.socket?.connected) {
                    return this.socket;
                }

                if (this.socket) {
                    this.socket.disconnect();
                    this.socket = null;
                }

                const socket = window.io({

                    path:
                        window.GAME_CONFIG.NETWORK.SOCKET_PATH,

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

                socket.on("connect", () => {

                    GAME.state.connected = true;

                    console.log(
                        "[NETWORK] Connected:",
                        socket.id
                    );

                });

                socket.on("disconnect", reason => {

                    GAME.state.connected = false;
                    GAME.state.playing = false;

                    GAME.movement.stop();
                    GAME.hideJoystick();

                    console.log(
                        "[NETWORK] Disconnected:",
                        reason
                    );

                });

                socket.on("connect_error", error => {

                    GAME.state.connected = false;

                    console.error(
                        "[NETWORK] Connection error:",
                        error.message
                    );

                });

                // WORLD INITIALIZATION

                socket.on("world:init", data => {

                    if (!data) return;

                    if (data.self) {

                        GAME.player = {
                            ...GAME.player,
                            ...data.self,
                            moving: false
                        };

                        GAME.world.currentMap =
                            data.self.map ||
                            GAME.world.currentMap;

                    }

                    GAME.world.players.clear();

                    if (Array.isArray(data.players)) {

                        data.players.forEach(remote => {

                            if (
                                !remote?.id ||
                                remote.id === GAME.player.id
                            ) {
                                return;
                            }

                            GAME.world.players.set(
                                remote.id,
                                {
                                    ...remote,
                                    moving: false
                                }
                            );

                        });

                    }

                    GAME.state.playing = true;

                    GAME.syncRenderer();

                    GAME.movement.start();
                    GAME.showJoystick();

                    console.log("[WORLD] World initialized");

                });

                // PLAYER JOINED

                socket.on("player:joined", remote => {

                    if (!remote?.id) return;

                    if (remote.id === GAME.player.id) {
                        return;
                    }

                    GAME.world.players.set(
                        remote.id,
                        {
                            ...remote,
                            moving: false
                        }
                    );

                    GAME.syncRenderer();

                });

                // PLAYER MOVED

                socket.on("player:moved", data => {

                    if (!data?.id) return;

                    if (data.id === GAME.player.id) {
                        return;
                    }

                    const previous =
                        GAME.world.players.get(data.id);

                    if (!previous) return;

                    const updated = {
                        ...previous,
                        ...data,

                        direction: [
                            "up",
                            "down",
                            "left",
                            "right"
                        ].includes(data.direction)
                            ? data.direction
                            : previous.direction,

                        moving:
                            typeof data.moving === "boolean"
                                ? data.moving
                                : false
                    };

                    GAME.world.players.set(
                        data.id,
                        updated
                    );

                    GAME.syncRenderer();

                });

                // PLAYER LEFT

                socket.on("player:left", data => {

                    const playerId =
                        typeof data === "string"
                            ? data
                            : data?.id;

                    if (!playerId) return;

                    GAME.world.players.delete(playerId);

                    GAME.syncRenderer();

                });

                return socket;

            },

            // WAIT FOR CONNECTION

            waitForConnection(timeout = 10000) {

                return new Promise((resolve, reject) => {

                    const socket = this.socket;

                    if (!socket) {

                        reject(
                            new Error("SOCKET_NOT_INITIALIZED")
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
                            new Error("CONNECTION_TIMEOUT")
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

        // ==================================
        // MOVEMENT SYSTEM
        // ==================================

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

            networkInterval: 100,

            animationFrame: null,

            joystickActive: false,

            keys: new Set(),

            // START

            start() {

                if (this.animationFrame !== null) {
                    return;
                }

                this.lastUpdate = performance.now();

                this.animationFrame =
                    requestAnimationFrame(time =>
                        this.update(time)
                    );

                console.log("[MOVEMENT] Started");

            },

            // STOP

            stop() {

                const wasMoving =
                    GAME.player.moving;

                if (this.animationFrame !== null) {

                    cancelAnimationFrame(
                        this.animationFrame
                    );

                    this.animationFrame = null;

                }

                this.keys.clear();

                this.keyboard.x = 0;
                this.keyboard.y = 0;

                this.joystick.x = 0;
                this.joystick.y = 0;

                this.joystickActive = false;

                GAME.player.moving = false;

                if (wasMoving) {
                    this.sendPosition();
                }

                GAME.syncRenderer();

            },

            // JOYSTICK

            setJoystick(x, y) {

                this.joystick.x =
                    Math.max(-1, Math.min(1, x));

                this.joystick.y =
                    Math.max(-1, Math.min(1, y));

                this.joystickActive =
                    Math.abs(x) > 0.05 ||
                    Math.abs(y) > 0.05;

            },

            // KEYBOARD

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

            // COLLISION CHECK
            // TEMPORARILY DISABLED

            canMoveTo(x, y) {

                return (
                    Number.isFinite(x) &&
                    Number.isFinite(y)
                );

            },

            // APPLY MOVEMENT

            movePlayer(dx, dy) {

                const nextX =
                    GAME.player.x + dx;

                const nextY =
                    GAME.player.y + dy;

                GAME.player.x = nextX;
                GAME.player.y = nextY;

                return true;

            },

            // UPDATE LOOP

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

                const hasInput =
                    Math.abs(x) > 0.01 ||
                    Math.abs(y) > 0.01;

                const wasMoving =
                    GAME.player.moving;

                let moved = false;

                if (hasInput) {

                    const dx =
                        x * this.speed * deltaTime;

                    const dy =
                        y * this.speed * deltaTime;

                    moved = this.movePlayer(dx, dy);

                    if (Math.abs(x) > Math.abs(y)) {

                        this.lastDirection =
                            x > 0 ? "right" : "left";

                    } else if (Math.abs(y) > 0.01) {

                        this.lastDirection =
                            y > 0 ? "down" : "up";

                    }

                    GAME.player.direction =
                        this.lastDirection;

                }

                GAME.player.moving = moved;

                if (moved) {

                    GAME.syncRenderer();

                    if (
                        time - this.lastNetworkUpdate >=
                        this.networkInterval
                    ) {

                        this.sendPosition();

                        this.lastNetworkUpdate = time;

                    }

                } else if (wasMoving) {

                    GAME.player.moving = false;

                    GAME.syncRenderer();

                    this.sendPosition();

                    this.lastNetworkUpdate = time;

                }

                this.animationFrame =
                    requestAnimationFrame(nextTime =>
                        this.update(nextTime)
                    );

            },

            // SEND POSITION

            sendPosition() {

                const socket =
                    GAME.network.socket;

                if (!socket?.connected) return;

                socket.emit("player:move", {

                    x: GAME.player.x,
                    y: GAME.player.y,

                    direction: GAME.player.direction,

                    moving: GAME.player.moving

                });

            }

        },

        // ==================================
        // RENDERER SYNCHRONIZATION
        // ==================================

        syncRenderer() {

            const renderer =
                window.ECHO_WORLD_RENDERER;

            if (!renderer) return;

            renderer.updatePlayer({

                id: GAME.player.id,

                x: GAME.player.x,
                y: GAME.player.y,

                name: GAME.player.name,

                direction: GAME.player.direction,

                moving: GAME.player.moving

            });

            GAME.world.players.forEach(remote => {

                renderer.updateRemotePlayer(remote);

            });

        },

        // ==================================
        // ENTER WORLD
        // ==================================

        async enterWorld(characterId) {

            if (!characterId) {

                throw new Error(
                    "กรุณาเลือกตัวละคร"
                );

            }

            if (!window.ECHO_AUTH?.getToken()) {

                throw new Error(
                    "กรุณาเข้าสู่ระบบก่อน"
                );

            }

            const socket = this.network.connect();

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
                                ...result.player,
                                moving: false
                            };

                            this.movement.lastDirection =
                                this.player.direction || "down";

                        }

                        this.world.currentMap =
                            this.player.map ||
                            this.world.currentMap;

                        this.world.players.clear();

                        if (Array.isArray(result.players)) {

                            result.players.forEach(remote => {

                                if (
                                    remote?.id &&
                                    remote.id !== this.player.id
                                ) {

                                    this.world.players.set(
                                        remote.id,
                                        {
                                            ...remote,
                                            moving: false
                                        }
                                    );

                                }

                            });

                        }

                        this.state.playing = true;

                        this.syncRenderer();

                        this.movement.start();

                        this.showJoystick();

                        resolve(result);

                    }
                );

            });

        },

        // ==================================
        // KEYBOARD INPUT
        // ==================================

        initKeyboard() {

            document.addEventListener(
                "keydown",
                event => {

                    const key =
                        event.key.toLowerCase();

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

                    if (!movementKeys.includes(key)) {
                        return;
                    }

                    if (!GAME.state.playing) {
                        return;
                    }

                    if (
                        event.target instanceof HTMLInputElement ||
                        event.target instanceof HTMLTextAreaElement
                    ) {
                        return;
                    }

                    event.preventDefault();

                    GAME.movement.keys.add(key);

                }
            );

            document.addEventListener(
                "keyup",
                event => {

                    GAME.movement.keys.delete(
                        event.key.toLowerCase()
                    );

                }
            );

            window.addEventListener("blur", () => {

                GAME.movement.stop();

            });

        },

        // ==================================
        // MOBILE JOYSTICK
        // ==================================

        joystickElement: null,

        initJoystick() {

            if (
                document.getElementById("mobile-joystick")
            ) {
                this.joystickElement =
                    document.getElementById("mobile-joystick");

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

                    pointer-events: none;

                }

            `;

            document.head.appendChild(style);

            const gameScreen =
                document.getElementById("game-screen");

            if (!gameScreen) {
                console.error("[JOYSTICK] Game screen not found");
                return;
            }

            const joystick =
                document.createElement("div");

            joystick.id = "mobile-joystick";

            const knob =
                document.createElement("div");

            knob.id = "mobile-joystick-knob";

            joystick.appendChild(knob);

            gameScreen.appendChild(joystick);

            const radius = 40;

            let pointerId = null;

            function moveJoystick(event) {

                const rect =
                    joystick.getBoundingClientRect();

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

                knob.style.transform =
                    "translate(0, 0)";

                GAME.movement.setJoystick(0, 0);

            }

            joystick.addEventListener(
                "pointerdown",
                event => {

                    if (!GAME.state.playing) return;

                    event.preventDefault();

                    pointerId = event.pointerId;

                    joystick.setPointerCapture(
                        pointerId
                    );

                    moveJoystick(event);

                }
            );

            joystick.addEventListener(
                "pointermove",
                event => {

                    if (event.pointerId !== pointerId) {
                        return;
                    }

                    event.preventDefault();

                    moveJoystick(event);

                }
            );

            joystick.addEventListener(
                "pointerup",
                event => {

                    if (event.pointerId !== pointerId) {
                        return;
                    }

                    releaseJoystick();

                }
            );

            joystick.addEventListener(
                "pointercancel",
                releaseJoystick
            );

            joystick.addEventListener(
                "lostpointercapture",
                releaseJoystick
            );

            this.joystickElement = joystick;

        },

        // SHOW JOYSTICK

        showJoystick() {

            if (!this.joystickElement) return;

            if (
                window.matchMedia("(pointer: coarse)").matches
            ) {

                this.joystickElement.classList.add("active");

            }

        },

        // HIDE JOYSTICK

        hideJoystick() {

            if (!this.joystickElement) return;

            this.joystickElement.classList.remove("active");

            this.movement.setJoystick(0, 0);

        },

        // ==================================
        // INITIALIZE
        // ==================================

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
                "Game Controller Version 1.0.0"
            );

            console.log(
                "Collision temporarily disabled"
            );

            console.log(
                "================================="
            );

            this.initKeyboard();

            this.initJoystick();

            this.state.initialized = true;
            this.state.loading = false;

        }

    };

    // ======================================
    // GLOBAL GAME OBJECT
    // ======================================

    window.ECHO_GAME = GAME;

    // ======================================
    // DOCUMENT READY
    // ======================================

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            GAME.init();

            document.addEventListener(
                "echo:world-entered",
                () => {

                    GAME.showJoystick();

                    GAME.syncRenderer();

                    if (window.ECHO_WORLD_RENDERER) {
                        window.ECHO_WORLD_RENDERER.start();
                    }

                }
            );

            document.getElementById("leave-world")
                ?.addEventListener("click", () => {

                    GAME.hideJoystick();

                    GAME.movement.stop();

                });

        }
    );

})();
