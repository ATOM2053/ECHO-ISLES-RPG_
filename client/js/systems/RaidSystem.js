/* =========================================
   ECHO ISLES RPG
   Raid System
========================================= */

(function () {
    "use strict";

    const RaidSystem = {

        socket: null,
        raids: new Map(),
        currentRaid: null,
        playerId: null,
        initialized: false,

        MAX_MEMBERS: 20,

        roles: [
            "tank",
            "dps",
            "support"
        ],

        raidDatabase: {

            dragon_sanctuary: {
                id: "dragon_sanctuary",
                name: "Dragon Sanctuary",
                title: "วิหารมังกรบรรพกาล",
                map: "dragon_abyss",
                minLevel: 70,
                maxMembers: 20,
                boss: "ancient_dragon",
                recommendedTanks: 2,
                recommendedSupports: 4,
                rewards: [
                    "ancient_dragon_heart",
                    "dragon_soul",
                    "legendary_equipment"
                ]
            },

            frostfall_raid: {
                id: "frostfall_raid",
                name: "Frostfall Citadel",
                title: "ป้อมปราการน้ำแข็ง",
                map: "frostfall_kingdom",
                minLevel: 45,
                maxMembers: 20,
                boss: "frost_dragon",
                recommendedTanks: 2,
                recommendedSupports: 3,
                rewards: [
                    "frost_dragon_scale",
                    "frozen_core",
                    "epic_equipment"
                ]
            },

            ancient_ruins_raid: {
                id: "ancient_ruins_raid",
                name: "Ancient Ruins",
                title: "ซากอารยธรรมโบราณ",
                map: "ancient_ruins",
                minLevel: 55,
                maxMembers: 20,
                boss: "ruin_colossus",
                recommendedTanks: 2,
                recommendedSupports: 4,
                rewards: [
                    "ancient_relic",
                    "colossus_core",
                    "rare_equipment"
                ]
            }

        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init(options = {}) {

            if (this.initialized) return;

            this.socket = options.socket || null;
            this.playerId = options.playerId || null;

            this.bindSocketEvents();

            this.initialized = true;

            console.log("[RaidSystem] Initialized");
        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            this.socket.on("raid:list", data => {

                if (!Array.isArray(data)) return;

                data.forEach(raid => {
                    this.updateRaid(raid);
                });

            });

            this.socket.on("raid:created", data => {

                this.updateRaid(data);

                this.currentRaid = data.id;

            });

            this.socket.on("raid:updated", data => {

                this.updateRaid(data);

            });

            this.socket.on("raid:invite", data => {

                this.emitEvent("raid:invitation", data);

            });

            this.socket.on("raid:started", data => {

                this.updateRaid(data);

                this.notify("Raid เริ่มต้นแล้ว!");

            });

            this.socket.on("raid:boss-updated", data => {

                this.updateRaid(data);

            });

            this.socket.on("raid:completed", data => {

                this.updateRaid(data);

                this.notify("Raid สำเร็จแล้ว!");

            });

            this.socket.on("raid:failed", data => {

                this.updateRaid(data);

                this.notify("Raid ล้มเหลว!");

            });

            this.socket.on("raid:reward", data => {

                this.emitEvent("raid:reward", data);

            });

            this.socket.on("raid:error", data => {

                this.notify(
                    data?.message || "เกิดข้อผิดพลาดในระบบ Raid"
                );

            });

        },

        /* =====================================
           REQUEST RAID LIST
        ===================================== */

        requestRaidList() {

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:request-list");

            return true;
        },

        /* =====================================
           GET RAID DATABASE
        ===================================== */

        getRaidDatabase() {

            return Object.values(this.raidDatabase);
        },

        getRaidTemplate(raidId) {

            return this.raidDatabase[raidId] || null;
        },

        getAvailableRaids(playerLevel) {

            return this.getRaidDatabase().filter(
                raid => Number(playerLevel) >= raid.minLevel
            );

        },

        /* =====================================
           CREATE RAID
        ===================================== */

        createRaid(raidId, raidName = "") {

            const template = this.getRaidTemplate(raidId);

            if (!template) {
                return {
                    success: false,
                    message: "ไม่พบ Raid นี้"
                };
            }

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            this.socket.emit("raid:create", {
                raidId,
                raidName: String(raidName).slice(0, 40)
            });

            return {
                success: true,
                message: "ส่งคำขอสร้าง Raid แล้ว"
            };

        },

        /* =====================================
           UPDATE RAID
        ===================================== */

        updateRaid(data) {

            if (!data || !data.id) return false;

            const current = this.raids.get(data.id);

            this.raids.set(data.id, {
                ...(current || {}),
                ...data
            });

            return true;
        },

        /* =====================================
           GET RAID
        ===================================== */

        getRaid(raidId) {

            return this.raids.get(raidId) || null;

        },

        getAllRaids() {

            return Array.from(this.raids.values());

        },

        getCurrentRaid() {

            if (!this.currentRaid) return null;

            return this.getRaid(this.currentRaid);

        },

        /* =====================================
           JOIN RAID
        ===================================== */

        joinRaid(raidId) {

            const raid = this.getRaid(raidId);

            if (!raid) {
                return {
                    success: false,
                    message: "ไม่พบห้อง Raid"
                };
            }

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            this.socket.emit("raid:join", {
                raidId
            });

            return {
                success: true,
                message: "ส่งคำขอเข้าร่วม Raid แล้ว"
            };

        },

        /* =====================================
           LEAVE RAID
        ===================================== */

        leaveRaid() {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:leave", {
                raidId: this.currentRaid
            });

            this.currentRaid = null;

            return true;
        },

        /* =====================================
           INVITE PLAYER
        ===================================== */

        invitePlayer(playerId) {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:invite", {
                raidId: this.currentRaid,
                playerId
            });

            return true;
        },

        /* =====================================
           ACCEPT INVITATION
        ===================================== */

        acceptInvitation(raidId) {

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:accept-invite", {
                raidId
            });

            return true;
        },

        /* =====================================
           REJECT INVITATION
        ===================================== */

        rejectInvitation(raidId) {

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:reject-invite", {
                raidId
            });

            return true;
        },

        /* =====================================
           KICK MEMBER
        ===================================== */

        kickMember(playerId) {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:kick", {
                raidId: this.currentRaid,
                playerId
            });

            return true;
        },

        /* =====================================
           CHANGE ROLE
        ===================================== */

        setRole(playerId, role) {

            if (!this.roles.includes(role)) {
                return false;
            }

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:set-role", {
                raidId: this.currentRaid,
                playerId,
                role
            });

            return true;
        },

        /* =====================================
           READY CHECK
        ===================================== */

        setReady(ready = true) {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:ready", {
                raidId: this.currentRaid,
                ready: Boolean(ready)
            });

            return true;
        },

        requestReadyCheck() {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:ready-check", {
                raidId: this.currentRaid
            });

            return true;
        },

        /* =====================================
           START RAID
        ===================================== */

        startRaid() {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:start", {
                raidId: this.currentRaid
            });

            return true;
        },

        /* =====================================
           RAID BOSS
        ===================================== */

        getBossStatus(raidId) {

            const raid = this.getRaid(raidId);

            if (!raid || !raid.boss) return null;

            return {
                ...raid.boss,
                hpPercent: raid.boss.maxHp > 0
                    ? raid.boss.hp / raid.boss.maxHp * 100
                    : 0
            };

        },

        /* =====================================
           BOSS ATTACK
        ===================================== */

        attackBoss(skillId = "basic_attack") {

            if (!this.currentRaid) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("raid:attack", {
                raidId: this.currentRaid,
                skillId
            });

            return true;
        },

        /* =====================================
           RAID PROGRESS
        ===================================== */

        getProgress(raidId) {

            const raid = this.getRaid(raidId);

            if (!raid) return null;

            return {
                status: raid.status || "waiting",
                currentStage: raid.currentStage || 0,
                totalStages: raid.totalStages || 1,
                progress: raid.totalStages > 0
                    ? raid.currentStage / raid.totalStages * 100
                    : 0
            };

        },

        /* =====================================
           MEMBERS
        ===================================== */

        getMembers(raidId) {

            const raid = this.getRaid(raidId);

            if (!raid || !Array.isArray(raid.members)) {
                return [];
            }

            return [...raid.members];
        },

        getMemberCount(raidId) {

            return this.getMembers(raidId).length;

        },

        isLeader() {

            const raid = this.getCurrentRaid();

            return Boolean(
                raid &&
                raid.leaderId === this.playerId
            );

        },

        /* =====================================
           RAID REWARDS
        ===================================== */

        getRewards(raidId) {

            const raid = this.getRaid(raidId);

            if (!raid) return [];

            return raid.rewards || [];

        },

        /* =====================================
           NOTIFICATION
        ===================================== */

        notify(message) {

            console.log("[RaidSystem]", message);

            window.dispatchEvent(
                new CustomEvent("raid:notification", {
                    detail: { message }
                })
            );

        },

        emitEvent(eventName, detail) {

            window.dispatchEvent(
                new CustomEvent(eventName, {
                    detail
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
                    "raid:list",
                    "raid:created",
                    "raid:updated",
                    "raid:invite",
                    "raid:started",
                    "raid:boss-updated",
                    "raid:completed",
                    "raid:failed",
                    "raid:reward",
                    "raid:error"
                ];

                events.forEach(event => {
                    this.socket.off(event);
                });

            }

            this.raids.clear();
            this.currentRaid = null;
            this.playerId = null;
            this.socket = null;
            this.initialized = false;

            console.log("[RaidSystem] Destroyed");

        }

    };

    window.RaidSystem = RaidSystem;

})();
