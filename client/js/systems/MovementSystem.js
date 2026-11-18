/* =========================================
   ECHO ISLES RPG
   Movement System
========================================= */

window.MovementSystem = (() => {

    "use strict";

    const config = window.GAME_CONFIG;

    let enabled = false;

    let socket = null;

    const input = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    const joystick = {
        active: false,
        x: 0,
        y: 0
    };

    let lastSent = 0;

    const NETWORK_INTERVAL = 100;

    // ตั้งค่าปุ่มควบคุม
    const KEY_MAP = {

        w: "up",
        ArrowUp: "up",

        s: "down",
        ArrowDown: "down",

        a: "left",
        ArrowLeft: "left",

        d: "right",
        ArrowRight: "right"

    };

    // เริ่มต้นระบบ
    function init(gameSocket = null) {

        if (enabled) return;

        socket = gameSocket;

        window.addEventListener("keydown", handleKeyDown);

        window.addEventListener("keyup", handleKeyUp);

        window.addEventListener("blur", clearInput);

        enabled = true;

        console.log("Movement System Initialized");

    }

    // กดปุ่ม
    function handleKeyDown(event) {

        const key = event.key;

        const direction = KEY_MAP[key];

        if (!direction) return;

        if (
            document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "TEXTAREA"
        ) {
            return;
        }

        event.preventDefault();

        input[direction] = true;

    }

    // ปล่อยปุ่ม
    function handleKeyUp(event) {

        const direction = KEY_MAP[event.key];

        if (!direction) return;

        input[direction] = false;

    }

    // ล้างปุ่มทั้งหมด
    function clearInput() {

        input.up = false;
        input.down = false;
        input.left = false;
        input.right = false;

        joystick.x = 0;
        joystick.y = 0;

    }

    // รับค่าจาก Virtual Joystick
    function setJoystick(x, y) {

        joystick.x = Math.max(-1, Math.min(1, Number(x) || 0));

        joystick.y = Math.max(-1, Math.min(1, Number(y) || 0));

        joystick.active = true;

    }

    // หยุด Joystick
    function stopJoystick() {

        joystick.x = 0;
        joystick.y = 0;

        joystick.active = false;

    }

    // คำนวณทิศทาง
    function getMovementDirection() {

        let x = 0;
        let y = 0;

        if (input.left) x -= 1;
        if (input.right) x += 1;

        if (input.up) y -= 1;
        if (input.down) y += 1;

        x += joystick.x;
        y += joystick.y;

        const length = Math.hypot(x, y);

        if (length > 1) {

            x /= length;
            y /= length;

        }

        return { x, y };

    }

    // อัปเดตการเคลื่อนที่
    function update(deltaTime) {

        if (!enabled) return;

        const player = window.PlayerSystem?.getLocalPlayer();

        if (!player) return;

        const movement = getMovementDirection();

        if (movement.x === 0 && movement.y === 0) {

            player.moving = false;

            return;

        }

        const speed = config.PLAYER.MOVEMENT_SPEED;

        const distance = speed * Math.min(deltaTime, 0.05);

        const nextX = player.x + movement.x * distance;

        const nextY = player.y + movement.y * distance;

        // กำหนดทิศทางตัวละคร
        if (Math.abs(movement.x) > Math.abs(movement.y)) {

            player.direction = movement.x > 0 ? "right" : "left";

        } else {

            player.direction = movement.y > 0 ? "down" : "up";

        }

        player.moving = true;

        // ส่งตำแหน่งไปยังเซิร์ฟเวอร์
        sendMovement(nextX, nextY, player.direction);

    }

    // ส่งข้อมูลการเดิน
    function sendMovement(x, y, direction) {

        const now = performance.now();

        if (now - lastSent < NETWORK_INTERVAL) return;

        lastSent = now;

        if (!socket?.connected) return;

        socket.emit("player:move", {

            x,
            y,
            direction

        });

    }

    // กำหนด Socket
    function setSocket(gameSocket) {

        socket = gameSocket;

    }

    // เปิดระบบ
    function enable() {

        enabled = true;

    }

    // ปิดระบบ
    function disable() {

        enabled = false;

        clearInput();

    }

    // ทำลายระบบ
    function destroy() {

        window.removeEventListener("keydown", handleKeyDown);

        window.removeEventListener("keyup", handleKeyUp);

        window.removeEventListener("blur", clearInput);

        clearInput();

        enabled = false;

        socket = null;

    }

    return {

        init,
        update,
        setJoystick,
        stopJoystick,
        setSocket,
        enable,
        disable,
        destroy

    };

})();

console.log("Movement System Loaded");
