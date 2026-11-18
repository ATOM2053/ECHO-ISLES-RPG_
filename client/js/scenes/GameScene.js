/* =========================================
   ECHO ISLES RPG
   Main Game Scene
========================================= */

window.GameScene = (() => {

    "use strict";

    let container = null;
    let canvas = null;
    let started = false;

    // สร้างหน้าจอโลกเกม
    function createGameScreen() {

        container = document.createElement("div");

        container.id = "game-screen";

        Object.assign(container.style, {
            position: "fixed",
            inset: "0",
            width: "100%",
            height: "100%",
            background: "#17251d",
            zIndex: "9999",
            overflow: "hidden"
        });

        canvas = document.createElement("canvas");

        canvas.id = "game-canvas";

        Object.assign(canvas.style, {
            display: "block",
            width: "100%",
            height: "100%",
            touchAction: "none"
        });

        container.appendChild(canvas);

        document.body.appendChild(container);

    }

    // เตรียมข้อมูลผู้เล่น
    function preparePlayers() {

        const game = window.ECHO_GAME;

        if (!game || !window.PlayerSystem) return;

        // กำหนดตัวละครของผู้เล่นปัจจุบัน
        if (game.player) {

            window.PlayerSystem.setLocalPlayer(game.player);

        }

        // โหลดผู้เล่นออนไลน์ที่มีอยู่
        if (game.world?.players) {

            for (const player of game.world.players.values()) {

                window.PlayerSystem.updatePlayer(player);

            }

        }

    }

    // เริ่มต้นฉากเกม
    function start() {

        if (started) return;

        const requiredSystems = [
            "ECHO_GAME",
            "PlayerSystem",
            "MovementSystem",
            "RenderSystem",
            "GameLoop"
        ];

        for (const system of requiredSystems) {

            if (!window[system]) {

                console.error(
                    "GameScene: Missing system:",
                    system
                );

                return false;

            }

        }

        createGameScreen();

        // โหลดข้อมูลผู้เล่น
        preparePlayers();

        // เชื่อมต่อระบบออนไลน์
        const socket = window.ECHO_GAME.network.socket;

        if (socket) {

            window.PlayerSystem.bindNetwork(socket);

            window.MovementSystem.init(socket);

        } else {

            window.MovementSystem.init();

        }

        // เริ่มระบบแสดงผล
        const renderReady =
            window.RenderSystem.init(canvas);

        if (!renderReady) {

            destroy();

            return false;

        }

        // เริ่มวงจรเกม
        window.GameLoop.start();

        window.ECHO_GAME.state.playing = true;

        started = true;

        console.log("ECHO ISLES Game Scene Started");

        return true;

    }

    // ออกจากฉากเกม
    function destroy() {

        if (window.GameLoop) {

            window.GameLoop.stop();

        }

        if (window.MovementSystem) {

            window.MovementSystem.destroy();

        }

        if (window.RenderSystem) {

            window.RenderSystem.destroy();

        }

        if (container) {

            container.remove();

        }

        container = null;
        canvas = null;

        started = false;

        if (window.ECHO_GAME) {

            window.ECHO_GAME.state.playing = false;

        }

        console.log("Game Scene Closed");

    }

    // ตรวจสอบสถานะฉาก
    function isStarted() {

        return started;

    }

    return {
        start,
        destroy,
        isStarted
    };

})();

console.log("Game Scene Loaded");
