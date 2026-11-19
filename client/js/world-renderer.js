/* =========================================
   ECHO ISLES RPG
   PIXEL WORLD RENDERER
   Version: 3.0.0
========================================= */

"use strict";

window.ECHO_WORLD_RENDERER = (() => {

    // ======================================
    // CONFIGURATION
    // ======================================

    const CONFIG = {
        mapImage: "/assets/maps/starting-village.png",
        mapWidth: 1672,
        mapHeight: 941,
        characterWidth: 32,
        characterHeight: 40
    };

    const COLORS = {
        playerSkin: "#f2d28a",
        playerHair: "#593c2b",
        playerClothes: "#28639b",
        playerDark: "#75452f",

        remoteSkin: "#8ac8ff",
        remoteHair: "#354b76",
        remoteClothes: "#4679bd",
        remoteDark: "#294b79"
    };

    // ======================================
    // STATE
    // ======================================

    let canvas = null;
    let ctx = null;

    let running = false;
    let animationFrame = null;

    let mapImage = new Image();
    let mapLoaded = false;
    let mapError = false;

    let player = {
        id: null,
        x: 400,
        y: 300,
        name: "Player",
        direction: "down",
        moving: false
    };

    // ======================================
    // GAME DATA
    // ======================================

    function getGame() {
        return window.ECHO_GAME || null;
    }

    function getRemotePlayers() {

        const game = getGame();

        if (!game?.world?.players) {
            return [];
        }

        const players = game.world.players;

        if (players instanceof Map) {
            return Array.from(players.values());
        }

        if (Array.isArray(players)) {
            return players;
        }

        return Object.values(players);
    }

    function getLocalPlayerId() {

        const game = getGame();

        return game?.player?.id || player.id || null;
    }

    // ======================================
    // LOAD MAP IMAGE
    // ======================================

    function loadMap() {

        return new Promise(resolve => {

            mapImage.onload = () => {

                mapLoaded = true;
                mapError = false;

                console.log(
                    "[WORLD RENDERER] Map loaded",
                    mapImage.width,
                    mapImage.height
                );

                resolve(true);
            };

            mapImage.onerror = () => {

                mapLoaded = false;
                mapError = true;

                console.error(
                    "[WORLD RENDERER] Cannot load map:",
                    CONFIG.mapImage
                );

                resolve(false);
            };

            mapImage.src = CONFIG.mapImage;

        });

    }

    // ======================================
    // CAMERA
    // ======================================

    function getCamera() {

        const maxX = Math.max(
            0,
            CONFIG.mapWidth - canvas.width
        );

        const maxY = Math.max(
            0,
            CONFIG.mapHeight - canvas.height
        );

        return {

            x: Math.max(
                0,
                Math.min(
                    player.x - canvas.width / 2,
                    maxX
                )
            ),

            y: Math.max(
                0,
                Math.min(
                    player.y - canvas.height / 2,
                    maxY
                )
            )

        };

    }

    // ======================================
    // DRAW MAP
    // ======================================

    function drawMap(camera) {

        ctx.fillStyle = "#101b24";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        if (!mapLoaded) {

            ctx.fillStyle = "#ffffff";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";

            ctx.fillText(
                mapError
                    ? "Unable to load village map"
                    : "Loading Starting Village...",
                canvas.width / 2,
                canvas.height / 2
            );

            return;
        }

        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
            mapImage,
            -camera.x,
            -camera.y
        );

    }

    // ======================================
    // DRAW CHARACTER
    // ======================================

    function drawCharacter(
        x,
        y,
        name,
        isLocal,
        direction,
        moving,
        camera,
        time
    ) {

        const screenX = Math.floor(x - camera.x);
        const screenY = Math.floor(y - camera.y);

        const skin = isLocal
            ? COLORS.playerSkin
            : COLORS.remoteSkin;

        const hair = isLocal
            ? COLORS.playerHair
            : COLORS.remoteHair;

        const clothes = isLocal
            ? COLORS.playerClothes
            : COLORS.remoteClothes;

        const dark = isLocal
            ? COLORS.playerDark
            : COLORS.remoteDark;

        const frame = moving
            ? Math.floor(time / 150) % 2
            : 0;

        // Shadow

        ctx.fillStyle = "rgba(0,0,0,0.4)";

        ctx.fillRect(
            screenX - 11,
            screenY - 3,
            22,
            6
        );

        // Legs

        ctx.fillStyle = dark;

        ctx.fillRect(
            screenX - 7,
            screenY - 11,
            5,
            9 + frame * 2
        );

        ctx.fillRect(
            screenX + 2,
            screenY - 11,
            5,
            9 + (1 - frame) * 2
        );

        // Boots

        ctx.fillStyle = "#302b2a";

        ctx.fillRect(
            screenX - 8,
            screenY - 3,
            6,
            3
        );

        ctx.fillRect(
            screenX + 2,
            screenY - 3,
            7,
            3
        );

        // Body

        ctx.fillStyle = dark;

        ctx.fillRect(
            screenX - 8,
            screenY - 24,
            16,
            15
        );

        ctx.fillStyle = clothes;

        ctx.fillRect(
            screenX - 7,
            screenY - 23,
            14,
            12
        );

        // Blue scarf

        ctx.fillStyle = "#28639b";

        ctx.fillRect(
            screenX - 6,
            screenY - 23,
            12,
            4
        );

        // Arms

        ctx.fillStyle = skin;

        ctx.fillRect(
            screenX - 10,
            screenY - 21,
            3,
            9
        );

        ctx.fillRect(
            screenX + 7,
            screenY - 21,
            3,
            9
        );

        // Head

        ctx.fillStyle = skin;

        ctx.fillRect(
            screenX - 7,
            screenY - 36,
            14,
            13
        );

        // Hair

        ctx.fillStyle = hair;

        ctx.fillRect(
            screenX - 8,
            screenY - 38,
            16,
            7
        );

        ctx.fillRect(
            screenX - 7,
            screenY - 32,
            3,
            5
        );

        ctx.fillRect(
            screenX + 4,
            screenY - 32,
            3,
            5
        );

        // Face

        if (direction !== "up") {

            ctx.fillStyle = "#292929";

            if (direction === "left") {

                ctx.fillRect(
                    screenX - 4,
                    screenY - 30,
                    2,
                    2
                );

            } else if (direction === "right") {

                ctx.fillRect(
                    screenX + 2,
                    screenY - 30,
                    2,
                    2
                );

            } else {

                ctx.fillRect(
                    screenX - 4,
                    screenY - 30,
                    2,
                    2
                );

                ctx.fillRect(
                    screenX + 2,
                    screenY - 30,
                    2,
                    2
                );

            }

        }

        // Player name

        if (name) {

            const label = String(name).slice(0, 20);

            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const width =
                ctx.measureText(label).width;

            ctx.fillStyle = "rgba(0,0,0,0.75)";

            ctx.fillRect(
                screenX - width / 2 - 5,
                screenY - 55,
                width + 10,
                16
            );

            ctx.fillStyle = isLocal
                ? "#ffe39b"
                : "#ffffff";

            ctx.fillText(
                label,
                screenX,
                screenY - 47
            );

        }

    }

    // ======================================
    // DRAW LOCAL PLAYER
    // ======================================

    function drawLocalPlayer(camera, time) {

        drawCharacter(
            player.x,
            player.y,
            player.name,
            true,
            player.direction,
            player.moving,
            camera,
            time
        );

    }

    // ======================================
    // DRAW REMOTE PLAYERS
    // ======================================

    function drawRemotePlayers(camera, time) {

        const localId = getLocalPlayerId();

        const game = getGame();

        const localMap =
            game?.player?.map ||
            game?.player?.map_id;

        for (const remote of getRemotePlayers()) {

            if (!remote || remote.id === localId) {
                continue;
            }

            if (
                !Number.isFinite(Number(remote.x)) ||
                !Number.isFinite(Number(remote.y))
            ) {
                continue;
            }

            const remoteMap =
                remote.map ||
                remote.map_id;

            if (
                remoteMap &&
                localMap &&
                remoteMap !== localMap
            ) {
                continue;
            }

            drawCharacter(
                Number(remote.x),
                Number(remote.y),
                remote.name || "Adventurer",
                false,
                remote.direction || "down",
                remote.moving === true,
                camera,
                time
            );

        }

    }

    // ======================================
    // RENDER
    // ======================================

    function render(timestamp = 0) {

        if (!running || !ctx || !canvas) {
            return;
        }

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const camera = getCamera();

        drawMap(camera);

        if (mapLoaded) {

            drawRemotePlayers(
                camera,
                timestamp
            );

            drawLocalPlayer(
                camera,
                timestamp
            );

        }

        animationFrame =
            requestAnimationFrame(render);

    }

    // ======================================
    // INITIALIZE
    // ======================================

    function init() {

        canvas = document.getElementById(
            "game-canvas"
        );

        if (!canvas) {

            console.error(
                "[WORLD RENDERER] Canvas not found"
            );

            return false;
        }

        ctx = canvas.getContext("2d");

        if (!ctx) {
            return false;
        }

        ctx.imageSmoothingEnabled = false;

        loadMap();

        return true;

    }

    // ======================================
    // START
    // ======================================

    function start() {

        if (!canvas || !ctx) {

            if (!init()) {
                return false;
            }

        }

        if (running) {
            return true;
        }

        running = true;

        render();

        console.log(
            "[WORLD RENDERER] Started"
        );

        return true;

    }

    // ======================================
    // STOP
    // ======================================

    function stop() {

        running = false;

        if (animationFrame !== null) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;

        }

        console.log(
            "[WORLD RENDERER] Stopped"
        );

    }

    // ======================================
    // UPDATE LOCAL PLAYER
    // ======================================

    function updatePlayer(data = {}) {

        if (Number.isFinite(Number(data.x))) {
            player.x = Number(data.x);
        }

        if (Number.isFinite(Number(data.y))) {
            player.y = Number(data.y);
        }

        if (data.name) {
            player.name = data.name;
        }

        if (data.id) {
            player.id = data.id;
        }

        if (data.direction) {
            player.direction = data.direction;
        }

        if (typeof data.moving === "boolean") {
            player.moving = data.moving;
        }

    }

    // ======================================
    // UPDATE REMOTE PLAYER
    // ======================================

    function updateRemotePlayer(data) {

        const game = getGame();

        if (!game || !game.world || !data || !data.id) {
            return;
        }

        if (!(game.world.players instanceof Map)) {
            game.world.players = new Map();
        }

        game.world.players.set(data.id, {
            ...game.world.players.get(data.id),
            ...data
        });

    }

    // ======================================
    // REMOVE REMOTE PLAYER
    // ======================================

    function removeRemotePlayer(playerId) {

        const game = getGame();

        if (game?.world?.players instanceof Map) {
            game.world.players.delete(playerId);
        }

    }

    // ======================================
    // PUBLIC API
    // ======================================

    return {

        init,
        start,
        stop,

        updatePlayer,
        updateRemotePlayer,
        removeRemotePlayer,

        get player() {
            return { ...player };
        },

        get running() {
            return running;
        },

        get mapLoaded() {
            return mapLoaded;
        }

    };

})();
