(function () {
    "use strict";

    let socket = null;
    let initialized = false;

    let currentDungeon = null;
    let dungeonList = [];
    let dungeonHistory = [];

    const callbacks = {
        onDungeonListUpdated: null,
        onDungeonEntered: null,
        onDungeonProgress: null,
        onBossSpawned: null,
        onDungeonCompleted: null,
        onDungeonFailed: null,
        onDungeonExited: null,
        onHistoryUpdated: null,
        onError: null
    };

    const DUNGEON_DATABASE = {
        slime_cave: {
            id: "slime_cave",
            name: "Slime Cave",
            displayName: "ถ้ำสไลม์",
            minLevel: 5,
            maxPlayers: 1,
            difficulty: "easy",
            timeLimit: 900,
            dailyLimit: 5,
            boss: "slime_king"
        },

        emerald_depths: {
            id: "emerald_depths",
            name: "Emerald Depths",
            displayName: "ถ้ำลึกมรกต",
            minLevel: 15,
            maxPlayers: 4,
            difficulty: "normal",
            timeLimit: 1800,
            dailyLimit: 3,
            boss: "forest_guardian"
        },

        ancient_temple: {
            id: "ancient_temple",
            name: "Ancient Temple",
            displayName: "วิหารโบราณ",
            minLevel: 30,
            maxPlayers: 5,
            difficulty: "hard",
            timeLimit: 2400,
            dailyLimit: 2,
            boss: "ancient_golem"
        },

        frostfall_abyss: {
            id: "frostfall_abyss",
            name: "Frostfall Abyss",
            displayName: "เหวน้ำแข็ง",
            minLevel: 45,
            maxPlayers: 5,
            difficulty: "expert",
            timeLimit: 2700,
            dailyLimit: 2,
            boss: "frost_dragon"
        },

        dragon_lair: {
            id: "dragon_lair",
            name: "Dragon Lair",
            displayName: "รังมังกร",
            minLevel: 60,
            maxPlayers: 8,
            difficulty: "legendary",
            timeLimit: 3600,
            dailyLimit: 1,
            boss: "elder_dragon"
        }
    };

    function emit(event, data = {}) {
        if (!socket || !socket.connected) {
            return false;
        }

        socket.emit(event, data);
        return true;
    }

    function notify(name, data) {
        if (typeof callbacks[name] === "function") {
            callbacks[name](data);
        }
    }

    // =====================================
    // DUNGEON DATABASE
    // =====================================

    function getDungeon(dungeonId) {
        const dungeon = DUNGEON_DATABASE[String(dungeonId)];

        return dungeon ? { ...dungeon } : null;
    }

    function getAllDungeons() {
        return Object.values(DUNGEON_DATABASE).map(dungeon => ({
            ...dungeon
        }));
    }

    function getAvailableDungeons() {
        const level = Number(
            window.ECHO_GAME?.player?.level
        ) || 1;

        return getAllDungeons().filter(dungeon => {
            return level >= dungeon.minLevel;
        });
    }

    function setDungeonList(list) {
        if (!Array.isArray(list)) return;

        dungeonList = list.filter(item =>
            item && typeof item.id === "string"
        );

        notify("onDungeonListUpdated", getDungeonList());
    }

    function getDungeonList() {
        return dungeonList.map(item => ({ ...item }));
    }

    // =====================================
    // ENTER DUNGEON
    // =====================================

    function enterDungeon(dungeonId) {
        const dungeon = getDungeon(dungeonId);

        if (!dungeon) {
            return {
                success: false,
                message: "ไม่พบดันเจี้ยนนี้"
            };
        }

        if (currentDungeon) {
            return {
                success: false,
                message: "คุณอยู่ในดันเจี้ยนแล้ว"
            };
        }

        const playerLevel = Number(
            window.ECHO_GAME?.player?.level
        ) || 1;

        if (playerLevel < dungeon.minLevel) {
            return {
                success: false,
                message: `ต้องมีเลเวลอย่างน้อย ${dungeon.minLevel}`
            };
        }

        const sent = emit("dungeon:enter", {
            dungeonId: dungeon.id
        });

        return {
            success: sent,
            message: sent
                ? "ส่งคำขอเข้าดันเจี้ยนแล้ว"
                : "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
        };
    }

    function leaveDungeon() {
        if (!currentDungeon) {
            return false;
        }

        return emit("dungeon:leave", {
            instanceId: currentDungeon.instanceId
        });
    }

    function getCurrentDungeon() {
        return currentDungeon
            ? { ...currentDungeon }
            : null;
    }

    function isInDungeon() {
        return currentDungeon !== null;
    }

    // =====================================
    // PARTY
    // =====================================

    function inviteParty() {
        if (!currentDungeon) {
            return false;
        }

        return emit("dungeon:invite-party", {
            instanceId: currentDungeon.instanceId
        });
    }

    function readyCheck() {
        if (!currentDungeon) {
            return false;
        }

        return emit("dungeon:ready-check", {
            instanceId: currentDungeon.instanceId
        });
    }

    // =====================================
    // PROGRESS
    // =====================================

    function updateProgress(data) {
        if (!currentDungeon || !data) return;

        currentDungeon.progress = {
            ...(currentDungeon.progress || {}),
            ...data
        };

        notify("onDungeonProgress", {
            dungeon: getCurrentDungeon(),
            progress: currentDungeon.progress
        });
    }

    function getProgress() {
        return currentDungeon?.progress || null;
    }

    // =====================================
    // HISTORY
    // =====================================

    function requestHistory()
