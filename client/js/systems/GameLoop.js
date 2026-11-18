/* =========================================
   ECHO ISLES RPG
   Game Loop System
========================================= */

window.GameLoop = (() => {

    "use strict";

    let running = false;
    let animationFrame = null;

    let previousTime = 0;
    let deltaTime = 0;

    const MAX_DELTA_TIME = 0.05;

    // เริ่มต้น Game Loop
    function start() {

        if (running) return;

        if (!window.RenderSystem) {
            console.error("RenderSystem not found!");
            return;
        }

        if (!window.MovementSystem) {
            console.error("MovementSystem not found!");
            return;
        }

        running = true;

        previousTime = performance.now();

        animationFrame = requestAnimationFrame(loop);

        console.log("Game Loop Started");

    }

    // หยุด Game Loop
    function stop() {

        if (!running) return;

        running = false;

        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
        }

        animationFrame = null;

        console.log("Game Loop Stopped");

    }

    // วงจรการทำงานหลัก
    function loop(currentTime) {

        if (!running) return;

        deltaTime = Math.min(
            (currentTime - previousTime) / 1000,
            MAX_DELTA_TIME
        );

        previousTime = currentTime;

        update(deltaTime);

        render();

        animationFrame = requestAnimationFrame(loop);

    }

    // อัปเดตระบบเกม
    function update(delta) {

        // ระบบเคลื่อนที่
        window.MovementSystem.update(delta);

    }

    // แสดงผลเกม
    function render() {

        window.RenderSystem.render();

    }

    // ตรวจสอบสถานะ
    function isRunning() {

        return running;

    }

    // คืนค่า Delta Time
    function getDeltaTime() {

        return deltaTime;

    }

    return {

        start,
        stop,
        update,
        render,
        isRunning,
        getDeltaTime

    };

})();

console.log("Game Loop System Loaded");
