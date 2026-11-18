/* =========================================
   ECHO ISLES RPG
   Player System
========================================= */

window.PlayerSystem = (() => {

    "use strict";

    const config = window.GAME_CONFIG;

    const players = new Map();

    let localPlayer = null;

    // สร้างข้อมูลตัวละคร
    function createPlayer(data = {}) {

        return {

            id: data.id || null,

            name: data.name || "Adventurer",

            race: data.race || "Human",

            gender: data.gender || "Male",

            level: data.level || 1,

            experience: data.experience || 0,

            hp: data.hp ?? 100,

            maxHp: data.maxHp || 100,

            mp: data.mp ?? 100,

            maxMp: data.maxMp || 100,

            attack: data.attack || 10,

            defense: data.defense || 5,

            gold: data.gold || 0,

            x: data.x ?? config.WORLD.DEFAULT_X,

            y: data.y ?? config.WORLD.DEFAULT_Y,

            direction: data.direction || "down",

            map: data.map || config.WORLD.DEFAULT_MAP,

            moving: false,

            createdAt: Date.now()

        };

    }

    // กำหนดตัวละครของผู้เล่นปัจจุบัน
    function setLocalPlayer(data) {

        localPlayer = createPlayer(data);

        players.set(localPlayer.id, localPlayer);

        return localPlayer;

    }

    // รับข้อมูลผู้เล่นจากเซิร์ฟเวอร์
    function updatePlayer(data) {

        if (!data || !data.id) return null;

        const existing = players.get(data.id);

        if (existing) {

            Object.assign(existing, data);

            return existing;

        }

        const player = createPlayer(data);

        players.set(player.id, player);

        return player;

    }

    // ลบผู้เล่นออกจากโลก
    function removePlayer(playerId) {

        if (!playerId) return;

        players.delete(playerId);

    }

    // รับข้อมูลตัวละคร
    function getPlayer(playerId) {

        return players.get(playerId) || null;

    }

    // รับตัวละครทั้งหมด
    function getAllPlayers() {

        return Array.from(players.values());

    }

    // รับตัวละครปัจจุบัน
    function getLocalPlayer() {

        return localPlayer;

    }

    // เปลี่ยนทิศทางตัวละคร
    function setDirection(direction) {

        if (!localPlayer) return;

        const directions = [
            "up",
            "down",
            "left",
            "right"
        ];

        if (!directions.includes(direction)) return;

        localPlayer.direction = direction;

    }

    // อัปเดตตำแหน่งในเครื่อง
    // ตำแหน่งจริงต้องได้รับการตรวจสอบจากเซิร์ฟเวอร์
    function updatePosition(x, y) {

        if (!localPlayer) return false;

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return false;
        }

        localPlayer.x = x;
        localPlayer.y = y;

        return true;

    }

    // เปลี่ยนแผนที่
    function changeMap(mapId) {

        if (!config.WORLD.MAPS.includes(mapId)) {

            console.warn("Unknown map:", mapId);

            return false;

        }

        if (!localPlayer) return false;

        localPlayer.map = mapId;

        return true;

    }

    // เพิ่ม EXP
    function addExperience(amount) {

        if (!localPlayer || amount <= 0) return;

        localPlayer.experience += amount;

        const requiredExp = localPlayer.level * 100;

        while (localPlayer.experience >= requiredExp) {

            localPlayer.experience -= requiredExp;

            localPlayer.level++;

            console.log(
                "Level Up!",
                localPlayer.level
            );

        }

    }

    // รับข้อมูลสถานะตัวละคร
    function getPlayerStats() {

        if (!localPlayer) return null;

        return {

            level: localPlayer.level,

            hp: localPlayer.hp,

            maxHp: localPlayer.maxHp,

            mp: localPlayer.mp,

            maxMp: localPlayer.maxMp,

            attack: localPlayer.attack,

            defense: localPlayer.defense,

            gold: localPlayer.gold,

            experience: localPlayer.experience

        };

    }

    // เชื่อมต่อกับระบบออนไลน์
    function bindNetwork(socket) {

        if (!socket) return;

        socket.on("world:init", (data) => {

            if (!data) return;

            setLocalPlayer(data.self);

            players.clear();

            for (const player of data.players || []) {

                updatePlayer(player);

            }

        });

        socket.on("player:joined", (data) => {

            updatePlayer(data);

        });

        socket.on("player:moved", (data) => {

            updatePlayer(data);

        });

        socket.on("player:left", (playerId) => {

            removePlayer(playerId);

        });

    }

    // API ของระบบ
    return {

        createPlayer,

        setLocalPlayer,

        updatePlayer,

        removePlayer,

        getPlayer,

        getAllPlayers,

        getLocalPlayer,

        setDirection,

        updatePosition,

        changeMap,

        addExperience,

        getPlayerStats,

        bindNetwork

    };

})();

console.log("Player System Loaded");
