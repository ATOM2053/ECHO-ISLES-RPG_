/* =========================================
   ECHO ISLES RPG
   WORLD RENDERER
   Version: 1.1.0
========================================= */

"use strict";

window.ECHO_WORLD_RENDERER = (() => {

    // ======================================
    // CONFIGURATION
    // ======================================

    const TILE_SIZE = 32;

    const COLORS = {
        grass: "#477c43",
        grassDark: "#3c6d39",
        grassLight: "#568c4c",
        path: "#9b8057",
        pathDark: "#806746",
        water: "#326f9b",
        waterLight: "#4b91b5",
        tree: "#285333",
        treeLight: "#3e7545",
        player: "#f2d28a",
        playerDark: "#a96b45",
        remotePlayer: "#8ac8ff",
        remoteDark: "#4679bd",
        text: "#ffffff"
    };

    // ======================================
    // STATE
    // ======================================

    let canvas = null;
    let ctx = null;

    let animationFrame = null;
    let running = false;

    let player = {
        id: null,
        x: 400,
        y: 300,
        name: "Player",
        direction: "down"
    };

    // ======================================
    // HELPERS
    // ======================================

    function getGame() {
        return window.ECHO_GAME || null;
    }

    function getRemotePlayers() {

        const game = getGame();

        if (!game || !game.world) {
            return [];
        }

        const players = game.world.players;

        if (players instanceof Map) {
            return Array.from(players.values());
        }

        if (Array.isArray(players)) {
            return players;
        }

        if (players && typeof players === "object") {
            return Object.values(players);
        }

        return [];
    }

    function getLocalPlayerId() {

        const game = getGame();

        return game?.player?.id ||
            player.id ||
            null;
    }

    function isRemotePlayer(item) {

        if (!item || typeof item !== "object") {
            return false;
        }

        const localId = getLocalPlayerId();

        if (localId && item.id === localId) {
            return false;
        }

        return (
            Number.isFinite(Number(item.x)) &&
            Number.isFinite(Number(item.y))
        );
    }

    // ======================================
    // RANDOM MAP
    // ======================================

    function seededRandom(x, y) {

        let value =
            Math.sin(x * 127.1 + y * 311.7) *
            43758.5453;

        return value - Math.floor(value);
    }

    function getTileType(x, y) {

        // Water area

        if (
            x >= 4 &&
            x <= 7 &&
            y >= 4 &&
            y <= 7
        ) {
            return "water";
        }

        // Main path

        if (
            Math.abs(x - 15) <= 1 ||
            Math.abs(y - 15) <= 1
        ) {
            return "path";
        }

        // Diagonal path

        if (Math.abs(x - y) <= 1) {
            return "path";
        }

        // Trees

        const random = seededRandom(x, y);

        if (random > 0.88) {
            return "tree";
        }

        return "grass";
    }

    // ======================================
    // DRAW TILE
    // ======================================

    function drawTile(type, x, y) {

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (type === "grass") {

            ctx.fillStyle = COLORS.grass;
            ctx.fillRect(
                px,
                py,
                TILE_SIZE,
                TILE_SIZE
            );

            const random = seededRandom(x, y);

            if (random > 0.5) {

                ctx.fillStyle = COLORS.grassLight;

                ctx.fillRect(
                    px + 7,
                    py + 8,
                    3,
                    3
                );

            }

            if (random < 0.3) {

                ctx.fillStyle = COLORS.grassDark;

                ctx.fillRect(
                    px + 20,
                    py + 22,
                    4,
                    3
                );

            }

        }

        else if (type === "path") {

            ctx.fillStyle = COLORS.path;

            ctx.fillRect(
                px,
                py,
                TILE_SIZE,
                TILE_SIZE
            );

            ctx.fillStyle = COLORS.pathDark;

            if (seededRandom(x, y) > 0.5) {

                ctx.fillRect(
                    px + 5,
                    py + 8,
                    5,
                    3
                );

            }

        }

        else if (type === "water") {

            ctx.fillStyle = COLORS.water;

            ctx.fillRect(
                px,
                py,
                TILE_SIZE,
                TILE_SIZE
            );

            ctx.fillStyle = COLORS.waterLight;

            if (seededRandom(x, y) > 0.4) {

                ctx.fillRect(
                    px + 6,
                    py + 12,
                    12,
                    3
                );

            }

        }

        else if (type === "tree") {

            ctx.fillStyle = COLORS.grass;

            ctx.fillRect(
                px,
                py,
                TILE_SIZE,
                TILE_SIZE
            );

            // Tree shadow

            ctx.fillStyle = "#24452b";

            ctx.fillRect(
                px + 5,
                py + 13,
                23,
                16
            );

            // Tree leaves

            ctx.fillStyle = COLORS.tree;

            ctx.fillRect(
                px + 7,
                py + 4,
                19,
                18
            );

            ctx.fillRect(
                px + 3,
                py + 9,
                26,
                12
            );

            ctx.fillStyle = COLORS.treeLight;

            ctx.fillRect(
                px + 10,
                py + 6,
                8,
                7
            );

            // Tree trunk

            ctx.fillStyle = "#795333";

            ctx.fillRect(
                px + 13,
                py + 20,
                7,
                10
            );

        }

    }

    // ======================================
    // DRAW MAP
    // ======================================

    function drawMap() {

        if (!ctx || !canvas) return;

        const cameraX =
            player.x - canvas.width / 2;

        const cameraY =
            player.y - canvas.height / 2;

        const startX = Math.floor(
            cameraX / TILE_SIZE
        );

        const startY = Math.floor(
            cameraY / TILE_SIZE
        );

        const endX = startX +
            Math.ceil(canvas.width / TILE_SIZE) + 1;

        const endY = startY +
            Math.ceil(canvas.height / TILE_SIZE) + 1;

        for (let y = startY; y <= endY; y++) {

            for (let x = startX; x <= endX; x++) {

                const screenX =
                    x * TILE_SIZE - cameraX;

                const screenY =
                    y * TILE_SIZE - cameraY;

                const type = getTileType(x, y);

                drawTile(type, x, y);

            }

        }

        return {
            cameraX,
            cameraY
        };

    }

    // ======================================
    // DRAW PLAYER SPRITE
    // ======================================

    function drawCharacter(
        x,
        y,
        name,
        isLocal,
        cameraX,
        cameraY
    ) {

        const screenX =
            x - cameraX;

        const screenY =
            y - cameraY;

        // Shadow

        ctx.fillStyle = "rgba(0,0,0,0.3)";

        ctx.fillRect(
            screenX - 10,
            screenY + 8,
            20,
            6
        );

        // Body

        ctx.fillStyle = isLocal
            ? COLORS.playerDark
            : COLORS.remoteDark;

        ctx.fillRect(
            screenX - 7,
            screenY - 5,
            14,
            15
        );

        // Head

        ctx.fillStyle = isLocal
            ? COLORS.player
            : COLORS.remotePlayer;

        ctx.fillRect(
            screenX - 6,
            screenY - 17,
            12,
            12
        );

        // Face

        ctx.fillStyle = "#292929";

        ctx.fillRect(
            screenX - 3,
            screenY - 12,
            2,
            2
        );

        ctx.fillRect(
            screenX + 2,
            screenY - 12,
            2,
            2
        );

        // Player name

        if (name) {

            ctx.font = "12px Arial";
            ctx.textAlign = "center";

            const label = String(name).slice(0, 20);

            const textWidth =
                ctx.measureText(label).width;

            ctx.fillStyle = "rgba(0,0,0,0.65)";

            ctx.fillRect(
                screenX - textWidth / 2 - 5,
                screenY - 35,
                textWidth + 10,
                16
            );

            ctx.fillStyle = COLORS.text;

            ctx.fillText(
                label,
                screenX,
                screenY - 23
            );

        }

    }

    // ======================================
    // DRAW LOCAL PLAYER
    // ======================================

    function drawLocalPlayer(cameraX, cameraY) {

        drawCharacter(
            player.x,
            player.y,
            player.name,
            true,
            cameraX,
            cameraY
        );

    }

    // ======================================
    // DRAW REMOTE PLAYERS
    // ======================================

    function drawRemotePlayers(cameraX, cameraY) {

        const remotePlayers = getRemotePlayers();

        for (const remote of remotePlayers) {

            if (!isRemotePlayer(remote)) {
                continue;
            }

            // ไม่แสดงผู้เล่นที่อยู่คนละแผนที่

            if (
                remote.map &&
                getGame()?.player?.map &&
                remote.map !== getGame().player.map
            ) {
                continue;
            }

            drawCharacter(
                Number(remote.x),
                Number(remote.y),
                remote.name || "Adventurer",
                false,
                cameraX,
                cameraY
            );

        }

    }

    // ======================================
    // RENDER FRAME
    // ======================================

    function render() {

        if (!ctx || !canvas || !running) {
            return;
        }

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const camera = drawMap();

        if (camera) {

            drawRemotePlayers(
                camera.cameraX,
                camera.cameraY
            );

            drawLocalPlayer(
                camera.cameraX,
                camera.cameraY
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
            console.error(
                "[WORLD RENDERER] Canvas context unavailable"
            );
            return false;
        }

        ctx.imageSmoothingEnabled = false;

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

        if (
            Number.isFinite(Number(data.x))
        ) {
            player.x = Number(data.x);
        }

        if (
            Number.isFinite(Number(data.y))
        ) {
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

    }

    // ======================================
    // UPDATE REMOTE PLAYER
    // ======================================

    function updateRemotePlayer(data) {

        const game = getGame();

        if (!game || !game.world || !data) {
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

        if (
            game?.world?.players instanceof Map
        ) {
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
        }

    };

})();
