/* =========================================
   ECHO ISLES RPG
   World Boss System
========================================= */

(function () {
    "use strict";

    const WorldBossSystem = {

        socket: null,
        bosses: new Map(),
        playerId: null,
        initialized: false,

        bossDatabase: {

            forest_guardian: {
                id: "forest_guardian",
                name: "Forest Guardian",
                title: "ผู้พิทักษ์แห่งป่า",
                map: "emerald_forest",
                level: 25,
                maxHp: 50000,
                attack: 450,
                defense: 200,
                respawnTime: 1800,
                rewards: [
                    "guardian_core",
                    "forest_crystal",
                    "rare_equipment"
                ],
                status: "waiting"
            },

            frost_dragon: {
                id: "frost_dragon",
                name: "Frost Dragon",
                title: "มังกรน้ำแข็งโบราณ",
                map: "frostfall_kingdom",
                level: 45,
                maxHp: 150000,
                attack: 900,
                defense: 500,
                respawnTime: 3600,
                rewards: [
                    "frost_dragon_scale",
                    "frozen_core",
                    "dragon_equipment"
                ],
                status: "waiting"
            },

            desert_titan: {
                id: "desert_titan",
                name: "Desert Titan",
                title: "ยักษ์แห่งทะเลทราย",
                map: "amber_desert",
                level: 35,
                maxHp: 90000,
                attack: 700,
                defense: 350,
                respawnTime: 2400,
                rewards: [
                    "titan_stone",
                    "desert_crystal",
                    "ancient_equipment"
                ],
                status: "waiting"
            },

            ancient_dragon: {
                id: "ancient_dragon",
                name: "Ancient Dragon",
                title: "มังกรบรรพกาล",
                map: "dragon_abyss",
                level: 80,
                maxHp: 500000,
                attack: 1800,
                defense: 1000,
                respawnTime: 7200,
                rewards: [
                    "ancient_dragon_heart",
                    "dragon_soul",
                    "legendary_equipment"
                ],
                status: "waiting"
            },

            ruin_colossus: {
                id: "ruin_colossus",
                name: "Ruin Colossus",
                title: "ยักษ์ผู้พิทักษ์ซากโบราณ",
                map: "ancient_ruins",
                level: 60,
                maxHp: 250000,
                attack: 1200,
                defense: 700,
                respawnTime: 5400,
                rewards: [
                    "colossus_core",
                    "ancient_relic",
                    "epic_equipment"
                ],
                status: "waiting"
            }

        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init(options = {}) {

            if (this.initialized) return;

            this.socket = options.socket || null;
            this.playerId = options.playerId || null;

            this.createDefaultBosses();
            this.bindSocketEvents();

            this.initialized = true;

            console.log("[WorldBossSystem] Initialized");
        },

        /* =====================================
           CREATE BOSSES
        ===================================== */

        createDefaultBosses() {

            Object.values(this.bossDatabase).forEach(template => {

                this.bosses.set(template.id, {
                    ...template,
                    hp: template.maxHp,
                    isAlive: false,
                    participants: [],
                    spawnTime: null,
                    defeatedAt: null,
                    nextSpawnAt: null,
                    lastAttacker: null
                });

            });

        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            this.socket.on("worldboss:list", data => {

                if (!Array.isArray(data)) return;

                data.forEach(boss => {
                    this.updateBoss(boss);
                });

            });

            this.socket.on("worldboss:spawned", data => {

                this.updateBoss(data);

                this.notify(
                    `${data.name || "World Boss"} ปรากฏตัวแล้ว!`
                );

            });

            this.socket.on("worldboss:updated", data => {

                this.updateBoss(data);

            });

            this.socket.on("worldboss:damaged", data => {

                this.updateBoss(data);

            });

            this.socket.on("worldboss:defeated", data => {

                this.updateBoss({
                    ...data,
                    isAlive: false,
                    status: "defeated"
                });

                this.notify(
                    `${data.name || "World Boss"} ถูกกำจัดแล้ว!`
                );

            });

            this.socket.on("worldboss:respawn", data => {

                this.updateBoss(data);

                this.notify(
                    `${data.name || "World Boss"} กลับมาเกิดใหม่แล้ว!`
                );

            });

            this.socket.on("worldboss:error", data => {

                this.notify(
                    data?.message || "เกิดข้อผิดพลาดในระบบ World Boss"
                );

            });

        },

        /* =====================================
           REQUEST BOSS DATA
        ===================================== */

        requestBossList() {

            if (!this.socket?.connected) return false;

            this.socket.emit("worldboss:request");

            return true;
        },

        /* =====================================
           UPDATE BOSS
        ===================================== */

        updateBoss(data) {

            if (!data || !data.id) return false;

            const current = this.bosses.get(data.id);

            if (!current) return false;

            const updated = {
                ...current,
                ...data
            };

            if (Number.isFinite(Number(data.hp))) {
                updated.hp = Math.max(
                    0,
                    Math.min(updated.maxHp, Number(data.hp))
                );
            }

            if (Number.isFinite(Number(data.maxHp))) {
                updated.maxHp = Number(data.maxHp);
            }

            this.bosses.set(data.id, updated);

            return true;
        },

        /* =====================================
           GET BOSS
        ===================================== */

        getBoss(bossId) {

            return this.bosses.get(bossId) || null;

        },

        getAllBosses() {

            return Array.from(this.bosses.values());

        },

        getBossesByMap(mapId) {

            return this.getAllBosses().filter(
                boss => boss.map === mapId
            );

        },

        getAliveBosses() {

            return this.getAllBosses().filter(
                boss => boss.isAlive
            );

        },

        getWaitingBosses() {

            return this.getAllBosses().filter(
                boss => !boss.isAlive
            );

        },

        /* =====================================
           BOSS STATUS
        ===================================== */

        getBossStatus(bossId) {

            const boss = this.getBoss(bossId);

            if (!boss) return null;

            return {
                id: boss.id,
                name: boss.name,
                map: boss.map,
                level: boss.level,
                hp: boss.hp,
                maxHp: boss.maxHp,
                hpPercent: boss.maxHp > 0
                    ? (boss.hp / boss.maxHp) * 100
                    : 0,
                isAlive: boss.isAlive,
                status: boss.status,
                participants: boss.participants.length,
                nextSpawnAt: boss.nextSpawnAt
            };

        },

        /* =====================================
           JOIN BOSS BATTLE
        ===================================== */

        joinBattle(bossId) {

            const boss = this.getBoss(bossId);

            if (!boss) {
                return {
                    success: false,
                    message: "ไม่พบบอส"
                };
            }

            if (!boss.isAlive) {
                return {
                    success: false,
                    message: "บอสยังไม่ปรากฏตัว"
                };
            }

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            this.socket.emit("worldboss:join", {
                bossId
            });

            return {
                success: true,
                message: "ส่งคำขอเข้าร่วมการต่อสู้แล้ว"
            };

        },

        /* =====================================
           LEAVE BOSS BATTLE
        ===================================== */

        leaveBattle(bossId) {

            if (!this.socket?.connected) return false;

            this.socket.emit("worldboss:leave", {
                bossId
            });

            return true;
        },

        /* =====================================
           ATTACK BOSS
        ===================================== */

        attackBoss(bossId, skillId = "basic_attack") {

            const boss = this.getBoss(bossId);

            if (!boss || !boss.isAlive) {
                return {
                    success: false,
                    message: "บอสไม่พร้อมต่อสู้"
                };
            }

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            this.socket.emit("worldboss:attack", {
                bossId,
                skillId
            });

            return {
                success: true,
                message: "ส่งคำสั่งโจมตีแล้ว"
            };

        },

        /* =====================================
           PARTICIPANTS
        ===================================== */

        getParticipants(bossId) {

            const boss = this.getBoss(bossId);

            if (!boss) return [];

            return [...boss.participants];

        },

        getParticipantCount(bossId) {

            const boss = this.getBoss(bossId);

            return boss ? boss.participants.length : 0;

        },

        /* =====================================
           REWARDS
        ===================================== */

        getBossRewards(bossId) {

            const boss = this.getBoss(bossId);

            if (!boss) return [];

            return [...boss.rewards];

        },

        /* =====================================
           PLAYER LEVEL CHECK
        ===================================== */

        canFight(bossId, playerLevel) {

            const boss = this.getBoss(bossId);

            if (!boss) return false;

            return Number(playerLevel) >= boss.level;

        },

        /* =====================================
           TIME UNTIL RESPAWN
        ===================================== */

        getRespawnRemaining(bossId) {

            const boss = this.getBoss(bossId);

            if (!boss || !boss.nextSpawnAt) return 0;

            return Math.max(
                0,
                Math.ceil((boss.nextSpawnAt - Date.now()) / 1000)
            );

        },

        /* =====================================
           NOTIFICATION
        ===================================== */

        notify(message) {

            console.log("[World Boss]", message);

            window.dispatchEvent(
                new CustomEvent("worldboss:notification", {
                    detail: { message }
                })
            );

        },

        /* =====================================
           SOCKET CONTROL
        ===================================== */

        setSocket(socket) {

            this.socket = socket;

            this.bindSocketEvents();

        },

        setPlayerId(playerId) {

            this.playerId = playerId;

        },

        /* =====================================
           DESTROY
        ===================================== */

        destroy() {

            if (this.socket) {

                const events = [
                    "worldboss:list",
                    "worldboss:spawned",
                    "worldboss:updated",
                    "worldboss:damaged",
                    "worldboss:defeated",
                    "worldboss:respawn",
                    "worldboss:error"
                ];

                events.forEach(event => {
                    this.socket.off(event);
                });

            }

            this.bosses.clear();

            this.socket = null;
            this.playerId = null;
            this.initialized = false;

            console.log("[WorldBossSystem] Destroyed");

        }

    };

    window.WorldBossSystem = WorldBossSystem;

})();
