/* =========================================
   ECHO ISLES RPG
   Title System
========================================= */

(function () {
    "use strict";

    const TitleSystem = {

        socket: null,
        titles: new Map(),
        unlocked: new Set(),
        activeTitle: null,
        initialized: false,

        database: {

            beginner_adventurer: {
                id: "beginner_adventurer",
                name: "Beginner Adventurer",
                displayName: "นักผจญภัยหน้าใหม่",
                rarity: "common",
                category: "adventure",
                bonus: {
                    hp: 10
                }
            },

            monster_hunter: {
                id: "monster_hunter",
                name: "Monster Hunter",
                displayName: "นักล่ามอนสเตอร์",
                rarity: "rare",
                category: "combat",
                bonus: {
                    attack: 5,
                    critical: 2
                }
            },

            dragon_slayer: {
                id: "dragon_slayer",
                name: "Dragon Slayer",
                displayName: "ผู้พิชิตมังกร",
                rarity: "legendary",
                category: "combat",
                bonus: {
                    attack: 20,
                    hp: 100,
                    critical: 5
                }
            },

            master_blacksmith: {
                id: "master_blacksmith",
                name: "Master Blacksmith",
                displayName: "ปรมาจารย์ช่างตีเหล็ก",
                rarity: "epic",
                category: "profession",
                bonus: {
                    defense: 10
                }
            },

            royal_guardian: {
                id: "royal_guardian",
                name: "Royal Guardian",
                displayName: "ผู้พิทักษ์ราชอาณาจักร",
                rarity: "epic",
                category: "kingdom",
                bonus: {
                    hp: 150,
                    defense: 15
                }
            },

            raid_conqueror: {
                id: "raid_conqueror",
                name: "Raid Conqueror",
                displayName: "ผู้พิชิต Raid",
                rarity: "legendary",
                category: "raid",
                bonus: {
                    attack: 15,
                    defense: 15
                }
            },

            world_explorer: {
                id: "world_explorer",
                name: "World Explorer",
                displayName: "นักสำรวจโลก",
                rarity: "rare",
                category: "exploration",
                bonus: {
                    hp: 50
                }
            },

            fishing_legend: {
                id: "fishing_legend",
                name: "Fishing Legend",
                displayName: "ตำนานนักตกปลา",
                rarity: "epic",
                category: "profession",
                bonus: {
                    luck: 10
                }
            },

            hidden_hero: {
                id: "hidden_hero",
                name: "Hidden Hero",
                displayName: "วีรบุรุษผู้ถูกซ่อนเร้น",
                rarity: "mythic",
                category: "secret",
                bonus: {
                    attack: 25,
                    hp: 200,
                    defense: 20
                }
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

            console.log("[TitleSystem] Initialized");

        },

        /* =====================================
           LOAD DATABASE
        ===================================== */

        loadDatabase() {

            Object.values(this.database).forEach(title => {

                this.titles.set(title.id, {
                    ...title,
                    bonus: { ...title.bonus }
                });

            });

        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            this.socket.on("title:sync", data => {

                if (!data) return;

                if (Array.isArray(data.unlocked)) {
                    this.unlocked = new Set(data.unlocked);
                }

                this.activeTitle = data.activeTitle || null;

            });

            this.socket.on("title:unlocked", data => {

                if (!data?.id) return;

                this.unlocked.add(data.id);

                const title = this.getTitle(data.id);

                this.notify(
                    `ปลดล็อกฉายา: ${title?.displayName || data.id}`
                );

            });

            this.socket.on("title:equipped", data => {

                this.activeTitle = data?.id || null;

                this.notify("เปลี่ยนฉายาเรียบร้อยแล้ว");

            });

            this.socket.on("title:error", data => {

                this.notify(
                    data?.message || "เกิดข้อผิดพลาดในระบบฉายา"
                );

            });

        },

        /* =====================================
           REQUEST SYNC
        ===================================== */

        requestSync() {

            if (!this.socket?.connected) return false;

            this.socket.emit("title:request");

            return true;

        },

        /* =====================================
           GET TITLES
        ===================================== */

        getAllTitles() {

            return Array.from(this.titles.values());

        },

        getTitle(id) {

            return this.titles.get(id) || null;

        },

        getUnlockedTitles() {

            return Array.from(this.unlocked)
                .map(id => this.getTitle(id))
                .filter(Boolean);

        },

        getLockedTitles() {

            return this.getAllTitles().filter(
                title => !this.unlocked.has(title.id)
            );

        },

        getTitlesByCategory(category) {

            return this.getAllTitles().filter(
                title => title.category === category
            );

        },

        /* =====================================
           UNLOCK
        ===================================== */

        requestUnlock(id) {

            if (!this.titles.has(id)) return false;

            if (!this.socket?.connected) return false;

            this.socket.emit("title:unlock", {
                id
            });

            return true;

        },

        isUnlocked(id) {

            return this.unlocked.has(id);

        },

        /* =====================================
           EQUIP TITLE
        ===================================== */

        equipTitle(id) {

            if (!this.unlocked.has(id)) {
                return {
                    success: false,
                    message: "ยังไม่ได้ปลดล็อกฉายานี้"
                };
            }

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            this.socket.emit("title:equip", {
                id
            });

            return {
                success: true,
                message: "ส่งคำขอเปลี่ยนฉายาแล้ว"
            };

        },

        /* =====================================
           UNEQUIP TITLE
        ===================================== */

        unequipTitle() {

            if (!this.socket?.connected) return false;

            this.socket.emit("title:unequip");

            return true;

        },

        /* =====================================
           ACTIVE TITLE
        ===================================== */

        getActiveTitle() {

            if (!this.activeTitle) return null;

            return this.getTitle(this.activeTitle);

        },

        getDisplayTitle(playerId) {

            if (playerId === window.ECHO_GAME?.player?.id) {
                return this.getActiveTitle();
            }

            return null;

        },

        /* =====================================
           TITLE BONUS
        ===================================== */

        getTitleBonus(id = this.activeTitle) {

            if (!id || !this.unlocked.has(id)) {
                return {
                    attack: 0,
                    defense: 0,
                    hp: 0,
                    luck: 0,
                    critical: 0
                };
            }

            const title = this.getTitle(id);

            if (!title) return {};

            return {
                attack: title.bonus.attack || 0,
                defense: title.bonus.defense || 0,
                hp: title.bonus.hp || 0,
                luck: title.bonus.luck || 0,
                critical: title.bonus.critical || 0
            };

        },

        /* =====================================
           TITLE EVENTS
        ===================================== */

        onMonsterKills(totalKills) {

            if (totalKills >= 100) {
                this.requestUnlock("monster_hunter");
            }

        },

        onDragonKilled() {

            this.requestUnlock("dragon_slayer");

        },

        onProfessionMastered(profession) {

            if (profession === "Blacksmith") {
                this.requestUnlock("master_blacksmith");
            }

            if (profession === "Fisher") {
                this.requestUnlock("fishing_legend");
            }

        },

        onRaidCompleted() {

            this.requestUnlock("raid_conqueror");

        },

        onWorldExplored() {

            this.requestUnlock("world_explorer");

        },

        onSecretDiscovered() {

            this.requestUnlock("hidden_hero");

        },

        /* =====================================
           NOTIFICATION
        ===================================== */

        notify(message) {

            console.log("[TitleSystem]", message);

            window.dispatchEvent(
                new CustomEvent("title:notification", {
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
                    "title:sync",
                    "title:unlocked",
                    "title:equipped",
                    "title:error"
                ].forEach(event => {
                    this.socket.off(event);
                });

            }

            this.titles.clear();
            this.unlocked.clear();

            this.activeTitle = null;
            this.socket = null;
            this.initialized = false;

            console.log("[TitleSystem] Destroyed");

        }

    };

    window.TitleSystem = TitleSystem;

})();
