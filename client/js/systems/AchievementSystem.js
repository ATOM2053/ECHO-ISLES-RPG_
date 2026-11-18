/* =========================================
   ECHO ISLES RPG
   Achievement System
========================================= */

(function () {
    "use strict";

    const AchievementSystem = {

        socket: null,
        achievements: new Map(),
        progress: new Map(),
        unlocked: new Set(),
        initialized: false,

        database: {

            first_adventure: {
                id: "first_adventure",
                name: "First Adventure",
                description: "เริ่มต้นการผจญภัยครั้งแรก",
                category: "adventure",
                tier: "bronze",
                target: 1,
                reward: { exp: 100, gold: 50 }
            },

            monster_hunter: {
                id: "monster_hunter",
                name: "Monster Hunter",
                description: "กำจัดมอนสเตอร์ 100 ตัว",
                category: "combat",
                tier: "silver",
                target: 100,
                reward: { exp: 1000, gold: 500 }
            },

            dragon_slayer: {
                id: "dragon_slayer",
                name: "Dragon Slayer",
                description: "กำจัดมังกรบรรพกาล",
                category: "combat",
                tier: "legendary",
                target: 1,
                reward: { exp: 10000, gold: 5000 }
            },

            master_blacksmith: {
                id: "master_blacksmith",
                name: "Master Blacksmith",
                description: "สร้างไอเทมสำเร็จ 100 ชิ้น",
                category: "crafting",
                tier: "gold",
                target: 100,
                reward: { exp: 3000, gold: 1500 }
            },

            fishing_master: {
                id: "fishing_master",
                name: "Fishing Master",
                description: "จับปลาได้ 100 ตัว",
                category: "profession",
                tier: "gold",
                target: 100,
                reward: { exp: 2500, gold: 1200 }
            },

            explorer: {
                id: "explorer",
                name: "World Explorer",
                description: "สำรวจพื้นที่ 8 แห่ง",
                category: "exploration",
                tier: "gold",
                target: 8,
                reward: { exp: 3000, gold: 2000 }
            },

            guild_member: {
                id: "guild_member",
                name: "Guild Member",
                description: "เข้าร่วมกิลด์",
                category: "social",
                tier: "bronze",
                target: 1,
                reward: { exp: 200, gold: 100 }
            },

            raid_veteran: {
                id: "raid_veteran",
                name: "Raid Veteran",
                description: "เข้าร่วม Raid สำเร็จ 10 ครั้ง",
                category: "raid",
                tier: "gold",
                target: 10,
                reward: { exp: 5000, gold: 3000 }
            },

            hidden_legend: {
                id: "hidden_legend",
                name: "Hidden Legend",
                description: "ความสำเร็จลับ",
                category: "secret",
                tier: "legendary",
                target: 1,
                hidden: true,
                reward: { exp: 20000, gold: 10000 }
            }

        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init(options = {}) {

            if (this.initialized) return;

            this.socket = options.socket || null;

            this.loadDatabase();
            this.bindSocketEvents();

            this.initialized = true;

            console.log("[AchievementSystem] Initialized");

        },

        /* =====================================
           LOAD DATABASE
        ===================================== */

        loadDatabase() {

            Object.values(this.database).forEach(item => {

                this.achievements.set(item.id, {
                    ...item,
                    reward: { ...item.reward }
                });

                if (!this.progress.has(item.id)) {
                    this.progress.set(item.id, 0);
                }

            });

        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            this.socket.on("achievement:sync", data => {

                if (!data) return;

                if (Array.isArray(data.progress)) {

                    data.progress.forEach(item => {
                        this.setProgress(item.id, item.value);
                    });

                }

                if (Array.isArray(data.unlocked)) {

                    data.unlocked.forEach(id => {
                        this.unlocked.add(id);
                    });

                }

            });

            this.socket.on("achievement:unlocked", data => {

                if (!data?.id) return;

                this.unlocked.add(data.id);

                this.notify(
                    `ปลดล็อกความสำเร็จ: ${data.name || data.id}`
                );

            });

            this.socket.on("achievement:error", data => {

                this.notify(
                    data?.message || "เกิดข้อผิดพลาด"
                );

            });

        },

        /* =====================================
           REQUEST SYNC
        ===================================== */

        requestSync() {

            if (!this.socket?.connected) return false;

            this.socket.emit("achievement:request");

            return true;

        },

        /* =====================================
           GET ACHIEVEMENTS
        ===================================== */

        getAll() {

            return Array.from(this.achievements.values())
                .filter(item => !item.hidden);

        },

        getAchievement(id) {

            return this.achievements.get(id) || null;

        },

        getByCategory(category) {

            return this.getAll().filter(
                item => item.category === category
            );

        },

        getUnlocked() {

            return Array.from(this.unlocked)
                .map(id => this.getAchievement(id))
                .filter(Boolean);

        },

        getLocked() {

            return this.getAll().filter(
                item => !this.unlocked.has(item.id)
            );

        },

        /* =====================================
           PROGRESS
        ===================================== */

        getProgress(id) {

            return this.progress.get(id) || 0;

        },

        setProgress(id, value) {

            const achievement = this.getAchievement(id);

            if (!achievement) return false;

            const progress = Math.max(
                0,
                Math.min(
                    achievement.target,
                    Number(value) || 0
                )
            );

            this.progress.set(id, progress);

            return true;

        },

        updateProgress(id, amount = 1) {

            const achievement = this.getAchievement(id);

            if (!achievement) return false;

            if (this.unlocked.has(id)) return false;

            const current = this.getProgress(id);

            const next = Math.min(
                achievement.target,
                current + Math.max(0, Number(amount) || 0)
            );

            this.progress.set(id, next);

            if (next >= achievement.target) {
                this.requestUnlock(id);
            }

            return true;

        },

        /* =====================================
           UNLOCK
        ===================================== */

        requestUnlock(id) {

            if (this.unlocked.has(id)) return false;

            const achievement = this.getAchievement(id);

            if (!achievement) return false;

            if (this.getProgress(id) < achievement.target) {
                return false;
            }

            if (!this.socket?.connected) {
                this.notify("ไม่สามารถยืนยันความสำเร็จจากเซิร์ฟเวอร์ได้");
                return false;
            }

            this.socket.emit("achievement:claim", {
                id
            });

            return true;

        },

        /* =====================================
           LOCAL UNLOCK STATE
        ===================================== */

        isUnlocked(id) {

            return this.unlocked.has(id);

        },

        getCompletionRate() {

            const visible = this.getAll();

            if (!visible.length) return 0;

            return (
                this.getUnlocked().length /
                visible.length
            ) * 100;

        },

        /* =====================================
           CATEGORY EVENTS
        ===================================== */

        onMonsterKilled(amount = 1) {

            this.updateProgress("monster_hunter", amount);

        },

        onDragonKilled() {

            this.updateProgress("dragon_slayer", 1);

        },

        onItemCrafted(amount = 1) {

            this.updateProgress("master_blacksmith", amount);

        },

        onFishCaught(amount = 1) {

            this.updateProgress("fishing_master", amount);

        },

        onMapDiscovered(amount = 1) {

            this.updateProgress("explorer", amount);

        },

        onGuildJoined() {

            this.updateProgress("guild_member", 1);

        },

        onRaidCompleted() {

            this.updateProgress("raid_veteran", 1);

        },

        onSecretDiscovered() {

            this.updateProgress("hidden_legend", 1);

        },

        /* =====================================
           REWARDS
        ===================================== */

        getReward(id) {

            const achievement = this.getAchievement(id);

            if (!achievement) return null;

            return {
                ...achievement.reward
            };

        },

        /* =====================================
           SUMMARY
        ===================================== */

        getSummary() {

            return {
                total: this.getAll().length,
                unlocked: this.getUnlocked().length,
                locked: this.getLocked().length,
                completion: this.getCompletionRate()
            };

        },

        /* =====================================
           NOTIFICATION
        ===================================== */

        notify(message) {

            console.log("[AchievementSystem]", message);

            window.dispatchEvent(
                new CustomEvent("achievement:notification", {
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

        /* =====================================
           DESTROY
        ===================================== */

        destroy() {

            if (this.socket) {

                [
                    "achievement:sync",
                    "achievement:unlocked",
                    "achievement:error"
                ].forEach(event => {
                    this.socket.off(event);
                });

            }

            this.achievements.clear();
            this.progress.clear();
            this.unlocked.clear();

            this.socket = null;
            this.initialized = false;

            console.log("[AchievementSystem] Destroyed");

        }

    };

    window.AchievementSystem = AchievementSystem;

})();
