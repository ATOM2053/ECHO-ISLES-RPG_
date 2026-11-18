/* =========================================
   ECHO ISLES RPG
   PIXEL WORLD RENDERER
   Version: 2.0.0
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
        pathLight: "#b29669",

        water: "#326f9b",
        waterLight: "#4b91b5",
        waterDark: "#245779",

        tree: "#285333",
        treeLight: "#3e7545",
        treeDark: "#193c29",

        trunk: "#795333",

        playerSkin: "#f2d28a",
        playerHair: "#593c2b",
        playerClothes: "#a96b45",
        playerDark: "#75452f",

        remoteSkin: "#8ac8ff",
        remoteHair: "#354b76",
        remoteClothes: "#4679bd",

        text: "#ffffff"
    };

    const WORLD = {
        mapName: "starting_village",
        renderDistance: 2
    };

    // ======================================
    // STATE
    // ======================================

    let canvas = null;
    let ctx = null;

    let animationFrame = null;
    let running = false;

    let lastFrameTime = 0;

    let player = {
        id: null,
        x: 400,
        y: 300,
        name: "Player",
        direction: "down",
        moving: false
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

    function random(x, y) {

        let value =
            Math.sin(x * 127.1 + y * 311.7) *
            43758.5453;

        return value - Math.floor(value);
    }

    // ======================================
    // MAP GENERATION
    // ======================================

    function getTileType(x, y) {

        // Lake

        if (
            x >= 4 &&
            x <= 7 &&
            y >= 4 &&
            y <= 7
        ) {
            return "water";
        }

        // Main road

        if (
            Math.abs(x - 15) <= 1 ||
            Math.abs(y - 15) <= 1
        ) {
            return "path";
        }

        // Diagonal road

        if (Math.abs(x - y) <= 1) {
            return "path";
        }

        // Trees

        if (random(x, y) > 0.88) {
            return "tree";
        }

        return "grass";
    }

    // ======================================
    // DRAW GRASS
    // ======================================

    function drawGrass(px, py, x, y) {

        ctx.fillStyle = COLORS.grass;

        ctx.fillRect(
            px,
            py,
            TILE_SIZE,
            TILE_SIZE
        );

        const value = random(x, y);

        if (value > 0.5) {

            ctx.fillStyle = COLORS.grassLight;

            ctx.fillRect(
                px + 7,
                py + 8,
                3,
                3
            );

            ctx.fillRect(
                px + 21,
                py + 20,
                2,
                2
            );

        }

        if (value < 0.3) {

            ctx.fillStyle = COLORS.grassDark;

            ctx.fillRect(
                px + 18,
                py + 7,
                4,
                3
            );

        }

    }

    // ======================================
    // DRAW PATH
    // ======================================

    function drawPath(px, py, x, y) {

        ctx.fillStyle = COLORS.path;

        ctx.fillRect(
            px,
            py,
            TILE_SIZE,
            TILE_SIZE
        );

        const value = random(x, y);

        ctx.fillStyle = COLORS.pathDark;

        if (value > 0.5) {

            ctx.fillRect(
                px + 5,
                py + 8,
                5,
                3
            );

        }

        ctx.fillStyle = COLORS.pathLight;

        if (value < 0.35) {

            ctx.fillRect(
                px + 20,
                py + 22,
                4,
                3
            );

        }

    }

    // ======================================
    // DRAW WATER
    // ======================================

    function drawWater(px, py, x, y, time) {

        ctx.fillStyle = COLORS.water;

        ctx.fillRect(
            px,
            py,
            TILE_SIZE,
            TILE_SIZE
        );

        ctx.fillStyle = COLORS.waterDark;

        ctx.fillRect(
            px,
            py + 26,
            TILE_SIZE,
            6
        );

        const wave =
            Math.floor(time / 500) % 2;

        ctx.fillStyle = COLORS.waterLight;

        ctx.fillRect(
            px + 5 + wave * 2,
            py + 10,
            12,
            3
        );

        ctx.fillRect(
            px + 19 - wave * 2,
            py + 21,
            8,
            2
        );

    }

    // ======================================
    // DRAW TREE
    // ======================================

    function drawTree(px, py) {

        // Ground

        ctx.fillStyle = COLORS.grass;

        ctx.fillRect(
            px,
            py,
            TILE_SIZE,
            TILE_SIZE
        );

        // Shadow

        ctx.fillStyle = "rgba(0,0,0,0.28)";

        ctx.fillRect(
            px + 4,
            py + 22,
            25,
            7
        );

        // Trunk

        ctx.fillStyle = COLORS.trunk;

        ctx.fillRect(
            px + 13,
            py + 18,
            7,
            13
        );

        // Leaves

        ctx.fillStyle = COLORS.treeDark;

        ctx.fillRect(
            px + 8,
            py + 7,
            17,
            17
        );

        ctx.fillRect(
            px + 4,
            py + 12,
            24,
            11
        );

        ctx.fillStyle = COLORS.tree;

        ctx.fillRect(
            px + 8,
            py + 5,
            17,
            15
        );

        ctx.fillRect(
            px + 3,
            py + 10,
            26,
            10
        );

        // Light

        ctx.fillStyle = COLORS.treeLight;

        ctx.fillRect(
            px + 10,
            py + 7,
            7,
            6
        );

        ctx.fillRect(
            px + 5,
            py + 12,
            5,
            4
        );

    }

    // ======================================
    // DRAW TILE
    // ======================================

    function drawTile(
        type,
        screenX,
        screenY,
        worldX,
        worldY,
        time
    ) {

        if (type === "grass") {

            drawGrass(
                screenX,
                screenY,
                worldX,
                worldY
            );

        }

        else if (type === "path") {

            drawPath(
                screenX,
                screenY,
                worldX,
                worldY
            );

        }

        else if (type === "water") {

            drawWater(
                screenX,
                screenY,
                worldX,
                worldY,
                time
            );

        }

        else if (type === "tree") {

            drawTree(
                screenX,
                screenY
            );

        }

    }

    // ======================================
    // DRAW MAP
    // ======================================

    function drawMap(time) {

        if (!ctx || !canvas) {
            return null;
        }

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

                // แปลงพิกัดโลกเป็นพิกัดหน้าจอ

                const screenX =
                    x * TILE_SIZE - cameraX;

                const screenY =
                    y * TILE_SIZE - cameraY;

                const type = getTileType(x, y);

                drawTile(
                    type,
                    Math.floor(screenX),
                    Math.floor(screenY),
                    x,
                    y,
                    time
                );

            }

        }

        return {
            cameraX,
            cameraY
        };

    }

    // ======================================
    // PIXEL CHARACTER
    // ======================================

    function drawPixelCharacter(
        screenX,
        screenY,
        isLocal,
        direction,
        moving,
        time
    ) {

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

        // Walking animation

        const frame = moving
            ? Math.floor(time / 140) % 2
            : 0;

        const legOffset = frame === 0 ? 0 : 2;

        // Pixel alignment

        const x = Math.floor(screenX);
        const y = Math.floor(screenY);

        // Shadow

        ctx.fillStyle = "rgba(0,0,0,0.35)";

        ctx.fillRect(
            x - 11,
            y - 2,
            22,
            6
        );

        // Legs

        ctx.fillStyle = dark;

        ctx.fillRect(
            x - 7,
            y - 10,
            5,
            9 + legOffset
        );

        ctx.fillRect(
            x + 2,
            y - 10,
            5,
            9 + (frame === 0 ? 2 : 0)
        );

        // Boots

        ctx.fillStyle = "#302b2a";

        ctx.fillRect(
            x - 8,
            y - 3 + legOffset,
            6,
            3
        );

        ctx.fillRect(
            x + 2,
            y - 3 + (frame === 0 ? 2 : 0),
            7,
            3
        );

        // Body

        ctx.fillStyle = dark;

        ctx.fillRect(
            x - 8,
            y - 23,
            16,
            14
        );

        ctx.fillStyle = clothes;

        ctx.fillRect(
            x - 7,
            y - 22,
            14,
            11
        );

        // Arms

        ctx.fillStyle = skin;

        ctx.fillRect(
            x - 10,
            y - 21,
            3,
            9
        );

        ctx.fillRect(
            x + 7,
            y - 21,
            3,
            9
        );

        // Head

        ctx.fillStyle = skin;

        ctx.fillRect(
            x - 7,
            y - 34,
            14,
            12
        );

        // Hair

        ctx.fillStyle = hair;

        ctx.fillRect(
            x - 8,
            y - 36,
            16,
            6
        );

        ctx.fillRect(
            x - 7,
            y - 31,
            3,
            5
        );

        ctx.fillRect(
            x + 4,
            y - 31,
            3,
            5
        );

        // Face direction

        ctx.fillStyle = "#292929";

        if (direction === "left") {

            ctx.fillRect(
                x - 4,
                y - 28,
                2,
                2
            );

        }

        else if (direction === "right") {

            ctx.fillRect(
                x + 2,
                y - 28,
                2,
                2
            );

        }

        else if (direction === "up") {

            ctx.fillStyle = hair;

            ctx.fillRect(
                x - 5,
                y - 32,
                10,
                5
            );

        }

        else {

            ctx.fillRect(
                x - 4,
                y - 28,
                2,
                2
            );

            ctx.fillRect(
                x + 2,
                y - 28,
                2,
                2
            );

        }

    }

    // ======================================
    // DRAW PLAYER NAME
    // ======================================

    function drawPlayerName(
        screenX,
        screenY,
        name,
        isLocal
    ) {

        if (!name) return;

        const label = String(name).slice(0, 20);

        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const width =
            ctx.measureText(label).width;

        const x = Math.floor(screenX);
        const y = Math.floor(screenY - 47);

        ctx.fillStyle = "rgba(0,0,0,0.72)";

        ctx.fillRect(
            x - width / 2 - 5,
            y - 8,
            width + 10,
            16
        );

        ctx.fillStyle = isLocal
            ? "#ffe39b"
            : COLORS.text;

        ctx.fillText(
            label,
            x,
            y
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
        cameraX,
        cameraY,
        time
    ) {

        const screenX = x - cameraX;
        const screenY = y - cameraY;

        drawPixelCharacter(
            screenX,
            screenY,
            isLocal,
            direction || "down",
            moving,
            time
        );

        drawPlayerName(
            screenX,
            screenY,
            name,
            isLocal
        );

    }

    // ======================================
    // DRAW LOCAL PLAYER
    // ======================================

    function drawLocalPlayer(
        cameraX,
        cameraY,
        time
    ) {

        drawCharacter(
            player.x,
            player.y,
            player.name,
            true,
            player.direction,
            player.moving,
            cameraX,
            cameraY,
            time
        );

    }

    // ======================================
    // DRAW REMOTE PLAYERS
    // ======================================

    function drawRemotePlayers(
        cameraX,
        cameraY,
        time
    ) {

        const remotePlayers = getRemotePlayers();

        for (const remote of remotePlayers) {

            if (!isRemotePlayer(remote)) {
                continue;
            }

            const game = getGame();

            const localMap =
                game?.player?.map ||
                game?.player?.map_id;

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
                cameraX,
                cameraY,
                time
            );

        }

    }

    // ======================================
    // RENDER FRAME
    // ======================================

    function render(timestamp = 0) {

        if (!ctx || !canvas || !running) {
            return;
        }

        lastFrameTime = timestamp;

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const camera = drawMap(timestamp);

        if (camera) {

            drawRemotePlayers(
                camera.cameraX,
                camera.cameraY,
                timestamp
            );

            drawLocalPlayer(
                camera.cameraX,
                camera.cameraY,
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
