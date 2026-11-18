/* =========================================
   ECHO ISLES RPG
   WORLD RENDERER
   Version: 1.0.0
========================================= */

"use strict";

window.ECHO_RENDERER = (() => {

    const TILE_SIZE = 32;

    let canvas = null;
    let ctx = null;
    let animationFrame = null;
    let running = false;

    let player = {
        x: 500,
        y: 500,
        name: "Player"
    };

    /* =====================================
       SEEDED RANDOM
    ===================================== */

    function random(x, y) {

        const value = Math.sin(
            x * 127.1 + y * 311.7
        ) * 43758.5453;

        return value - Math.floor(value);

    }

    /* =====================================
       INITIALIZE
    ===================================== */

    function init() {

        canvas = document.getElementById("game-canvas");

        if (!canvas) {
            console.error("Game canvas not found.");
            return false;
        }

        ctx = canvas.getContext("2d");

        if (!ctx) {
            console.error("Canvas context unavailable.");
            return false;
        }

        ctx.imageSmoothingEnabled = false;

        return true;

    }

    /* =====================================
       DRAW GRASS
    ===================================== */

    function drawGrass(x, y, screenX, screenY) {

        const variation = random(x, y);

        ctx.fillStyle = variation > 0.5
            ? "#527d43"
            : "#4b753e";

        ctx.fillRect(
            screenX,
            screenY,
            TILE_SIZE,
            TILE_SIZE
        );

        if (variation > 0.65) {

            ctx.fillStyle = "#739b52";

            ctx.fillRect(
                screenX + 8,
                screenY + 7,
                3,
                3
            );

            ctx.fillRect(
                screenX + 22,
                screenY + 20,
                3,
                3
            );

        }

    }

    /* =====================================
       DRAW PATH
    ===================================== */

    function isPath(x, y) {

        const horizontal =
            Math.abs(y - 15) <= 2;

        const vertical =
            Math.abs(x - 15) <= 2;

        const diagonal =
            Math.abs((x - 15) - (y - 15)) <= 2;

        return horizontal || vertical || diagonal;

    }

    function drawPath(screenX, screenY, x, y) {

        ctx.fillStyle = "#9b8055";

        ctx.fillRect(
            screenX,
            screenY,
            TILE_SIZE,
            TILE_SIZE
        );

        ctx.fillStyle = "#b69a6a";

        if (random(x, y) > 0.5) {

            ctx.fillRect(
                screenX + 8,
                screenY + 10,
                5,
                4
            );

        }

    }

    /* =====================================
       DRAW WATER
    ===================================== */

    function isWater(x, y) {

        const dx = x - 5;
        const dy = y - 5;

        return (
            dx * dx + dy * dy < 35
        );

    }

    function drawWater(screenX, screenY, x, y) {

        ctx.fillStyle = "#286b91";

        ctx.fillRect(
            screenX,
            screenY,
            TILE_SIZE,
            TILE_SIZE
        );

        ctx.fillStyle = "#5ca6c5";

        if (random(x, y) > 0.4) {

            ctx.fillRect(
                screenX + 7,
                screenY + 12,
                10,
                3
            );

        }

    }

    /* =====================================
       DRAW TREE
    ===================================== */

    function drawTree(screenX, screenY) {

        ctx.fillStyle = "#65452c";

        ctx.fillRect(
            screenX + 13,
            screenY + 17,
            7,
            13
        );

        ctx.fillStyle = "#285d37";

        ctx.fillRect(
            screenX + 4,
            screenY + 5,
            24,
            19
        );

        ctx.fillStyle = "#397d45";

        ctx.fillRect(
            screenX + 8,
            screenY,
            16,
            17
        );

        ctx.fillStyle = "#65a354";

        ctx.fillRect(
            screenX + 10,
            screenY + 4,
            5,
            4
        );

    }

    /* =====================================
       DRAW PLAYER
    ===================================== */

    function drawPlayer() {

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Shadow

        ctx.fillStyle = "rgba(0,0,0,0.3)";

        ctx.fillRect(
            centerX - 10,
            centerY + 12,
            20,
            5
        );

        // Body

        ctx.fillStyle = "#345b9b";

        ctx.fillRect(
            centerX - 8,
            centerY - 3,
            16,
            17
        );

        // Head

        ctx.fillStyle = "#e8b98d";

        ctx.fillRect(
            centerX - 7,
            centerY - 15,
            14,
            13
        );

        // Hair

        ctx.fillStyle = "#493324";

        ctx.fillRect(
            centerX - 8,
            centerY - 17,
            16,
            5
        );

        // Eyes

        ctx.fillStyle = "#242424";

        ctx.fillRect(
            centerX - 4,
            centerY - 9,
            2,
            2
        );

        ctx.fillRect(
            centerX + 3,
            centerY - 9,
            2,
            2
        );

        // Name

        ctx.font = "12px Arial";

        ctx.textAlign = "center";

        ctx.fillStyle = "#ffffff";

        ctx.fillText(
            player.name,
            centerX,
            centerY - 25
        );

    }

    /* =====================================
       DRAW MAP
    ===================================== */

    function drawMap() {

        if (!ctx || !canvas) return;

        const tilesX = Math.ceil(
            canvas.width / TILE_SIZE
        ) + 2;

        const tilesY = Math.ceil(
            canvas.height / TILE_SIZE
        ) + 2;

        const startTileX = Math.floor(
            player.x / TILE_SIZE
        );

        const startTileY = Math.floor(
            player.y / TILE_SIZE
        );

        const offsetX =
            canvas.width / 2 -
            player.x +
            startTileX * TILE_SIZE;

        const offsetY =
            canvas.height / 2 -
            player.y +
            startTileY * TILE_SIZE;

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        for (let y = -1; y < tilesY; y++) {

            for (let x = -1; x < tilesX; x++) {

                const worldX = startTileX + x;
                const worldY = startTileY + y;

                const screenX =
                    Math.floor(offsetX + x * TILE_SIZE);

                const screenY =
                    Math.floor(offsetY + y * TILE_SIZE);

                drawGrass(
                    worldX,
                    worldY,
                    screenX,
                    screenY
                );

                if (isWater(worldX, worldY)) {

                    drawWater(
                        screenX,
                        screenY,
                        worldX,
                        worldY
                    );

                } else if (isPath(worldX, worldY)) {

                    drawPath(
                        screenX,
                        screenY,
                        worldX,
                        worldY
                    );

                } else if (
                    random(worldX, worldY) > 0.94
                ) {

                    drawTree(
                        screenX,
                        screenY
                    );

                }

            }

        }

        drawPlayer();

    }

    /* =====================================
       RENDER LOOP
    ===================================== */

    function render() {

        if (!running) return;

        drawMap();

        animationFrame =
            requestAnimationFrame(render);

    }

    /* =====================================
       START
    ===================================== */

    function start() {

        if (!init()) return false;

        if (running) return true;

        running = true;

        render();

        return true;

    }

    /* =====================================
       STOP
    ===================================== */

    function stop() {

        running = false;

        if (animationFrame !== null) {

            cancelAnimationFrame(animationFrame);

            animationFrame = null;

        }

    }

    /* =====================================
       UPDATE PLAYER
    ===================================== */

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

    }

    /* =====================================
       PUBLIC API
    ===================================== */

    return {

        start,
        stop,
        updatePlayer,

        get running() {
            return running;
        }

    };

})();
