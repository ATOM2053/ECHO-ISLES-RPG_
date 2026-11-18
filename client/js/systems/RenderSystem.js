/* =========================================
   ECHO ISLES RPG
   Render System
========================================= */

window.RenderSystem = (() => {

    "use strict";

    let canvas = null;
    let ctx = null;

    let width = 0;
    let height = 0;

    const camera = {
        x: 0,
        y: 0,
        smoothing: 0.12
    };

    let initialized = false;

    // สีพื้นฐานของโลก
    const WORLD_COLORS = {
        grass: "#315c42",
        grassDark: "#284b36",
        path: "#8b7651",
        pathDark: "#6c593d",
        water: "#244e70",
        waterLight: "#397da0"
    };

    // เริ่มต้นระบบแสดงผล
    function init(canvasElement) {

        if (!canvasElement) {
            console.error("RenderSystem: Canvas not found.");
            return false;
        }

        canvas = canvasElement;
        ctx = canvas.getContext("2d");

        if (!ctx) {
            console.error("RenderSystem: Canvas context unavailable.");
            return false;
        }

        resize();

        window.addEventListener("resize", resize);

        initialized = true;

        console.log("Render System Initialized");

        return true;
    }

    // ปรับขนาด Canvas
    function resize() {

        if (!canvas || !ctx) return;

        const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        const rect = canvas.getBoundingClientRect();

        width = rect.width;
        height = rect.height;

        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);

        ctx.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );

        ctx.imageSmoothingEnabled = false;
    }

    // อัปเดตกล้อง
    function updateCamera(player) {

        if (!player) return;

        const targetX = player.x - width / 2;
        const targetY = player.y - height / 2;

        camera.x += (
            targetX - camera.x
        ) * camera.smoothing;

        camera.y += (
            targetY - camera.y
        ) * camera.smoothing;
    }

    // ล้างหน้าจอ
    function clear() {

        ctx.fillStyle = WORLD_COLORS.grassDark;

        ctx.fillRect(0, 0, width, height);
    }

    // วาดพื้นโลก
    function renderGround() {

        const tileSize = 64;

        const startX = Math.floor(camera.x / tileSize) * tileSize;
        const startY = Math.floor(camera.y / tileSize) * tileSize;

        const endX = camera.x + width + tileSize;
        const endY = camera.y + height + tileSize;

        for (let y = startY; y < endY; y += tileSize) {

            for (let x = startX; x < endX; x += tileSize) {

                const screenX = x - camera.x;
                const screenY = y - camera.y;

                const variation = Math.abs(
                    Math.sin(x * 0.03 + y * 0.02)
                );

                ctx.fillStyle = variation > 0.5
                    ? WORLD_COLORS.grass
                    : WORLD_COLORS.grassDark;

                ctx.fillRect(
                    screenX,
                    screenY,
                    tileSize,
                    tileSize
                );

                // รายละเอียดพื้นหญ้า
                ctx.fillStyle = "rgba(180, 210, 140, 0.12)";

                ctx.fillRect(
                    screenX + 15,
                    screenY + 20,
                    3,
                    3
                );

                ctx.fillRect(
                    screenX + 43,
                    screenY + 48,
                    2,
                    3
                );
            }
        }
    }

    // วาดตัวละคร
    function renderPlayer(player, isLocal = false) {

        if (!player) return;

        const screenX = player.x - camera.x;
        const screenY = player.y - camera.y;

        // เงาใต้ตัวละคร
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";

        ctx.beginPath();

        ctx.ellipse(
            screenX,
            screenY + 13,
            12,
            6,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // เสื้อ
        ctx.fillStyle = isLocal
            ? "#4e8bd6"
            : "#b78b55";

        ctx.fillRect(
            screenX - 8,
            screenY - 5,
            16,
            17
        );

        // ศีรษะ
        ctx.fillStyle = "#e8bd91";

        ctx.fillRect(
            screenX - 7,
            screenY - 19,
            14,
            14
        );

        // ผม
        ctx.fillStyle = "#493327";

        ctx.fillRect(
            screenX - 7,
            screenY - 21,
            14,
            5
        );

        // ดวงตา
        ctx.fillStyle = "#222222";

        ctx.fillRect(
            screenX - 4,
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

        // ชื่อตัวละคร
        ctx.font = "12px Kanit";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";

        ctx.fillText(
            player.name || "Adventurer",
            screenX,
            screenY - 28
        );
    }

    // วาดผู้เล่นทั้งหมด
    function renderPlayers() {

        const localPlayer =
            window.PlayerSystem?.getLocalPlayer();

        const allPlayers =
            window.PlayerSystem?.getAllPlayers() || [];

        for (const player of allPlayers) {

            const isLocal =
                player.id === localPlayer?.id;

            renderPlayer(player, isLocal);
        }
    }

    // วาดแผนที่
    function renderMap() {

        renderGround();

    }

    // วาดโลกทั้งหมด
    function render() {

        if (!initialized) return;

        const player =
            window.PlayerSystem?.getLocalPlayer();

        updateCamera(player);

        clear();

        renderMap();

        renderPlayers();
    }

    // คืนค่ากล้อง
    function getCamera() {

        return { ...camera };

    }

    // ทำลายระบบ
    function destroy() {

        window.removeEventListener("resize", resize);

        canvas = null;
        ctx = null;

        initialized = false;
    }

    return {
        init,
        resize,
        render,
        getCamera,
        destroy
    };

})();

console.log("Render System Loaded");
