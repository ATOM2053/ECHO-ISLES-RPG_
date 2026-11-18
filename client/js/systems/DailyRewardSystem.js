/* =========================================
   ECHO ISLES RPG
   Daily Reward System
========================================= */

(function () {
    "use strict";

    const DailyRewardSystem = {

        socket: null,
        rewards: new Map(),
        claimedDays: new Set(),
        currentStreak: 0,
        lastClaimDate: null,
        initialized: false,

        rewardDatabase: {

            1: {
                day: 1,
                name: "Welcome Gift",
                items: [
                    { id: "health_potion", quantity: 5 }
                ],
                gold: 100,
                exp: 100
            },

            2: {
                day: 2,
                name: "Adventurer Gift",
                items: [
                    { id: "mana_potion", quantity: 5 }
                ],
                gold: 150,
                exp: 150
            },

            3: {
                day: 3,
                name: "Explorer Gift",
                items: [
                    { id: "iron_ore", quantity: 10 }
                ],
                gold: 250,
                exp: 200
            },

            4: {
                day: 4,
                name: "Hunter Gift",
                items: [
                    { id: "health_potion", quantity: 10 }
                ],
                gold: 300,
                exp: 250
            },

            5: {
                day: 5,
                name: "Rare Gift",
                items: [
                    { id: "herb", quantity: 15 }
                ],
                gold: 500,
                exp: 400
            },

            6: {
                day: 6,
                name: "Elite Gift",
                items: [
                    { id: "mana_potion", quantity: 15 }
                ],
                gold: 750,
                exp: 600
            },

            7: {
                day: 7,
                name: "Legendary Gift",
                items: [
                    { id: "rare_equipment", quantity: 1 }
                ],
                gold: 2000,
                exp: 1500,
                special: true
            }

        },

        /* =====================================
           INITIALIZE
        ===================================== */

        init(options = {}) {

            if (this.initialized) return;

            this.socket = options.socket || null;

            this.loadRewards();
            this.bindSocketEvents();

            this.initialized = true;

            console.log("[DailyRewardSystem] Initialized");

        },

        /* =====================================
           LOAD REWARDS
        ===================================== */

        loadRewards() {

            Object.values(this.rewardDatabase).forEach(reward => {

                this.rewards.set(reward.day, {
                    ...reward,
                    items: reward.items.map(item => ({
                        ...item
                    }))
                });

            });

        },

        /* =====================================
           SOCKET EVENTS
        ===================================== */

        bindSocketEvents() {

            if (!this.socket) return;

            this.socket.on("daily:sync", data => {

                if (!data) return;

                this.currentStreak =
                    Math.max(0, Number(data.streak) || 0);

                this.lastClaimDate =
                    data.lastClaimDate || null;

                this.claimedDays = new Set(
                    Array.isArray(data.claimedDays)
                        ? data.claimedDays
                        : []
                );

            });

            this.socket.on("daily:claimed", data => {

                if (!data) return;

                this.currentStreak =
                    Math.max(0, Number(data.streak) || 0);

                this.lastClaimDate =
                    data.lastClaimDate || null;

                if (data.day) {
                    this.claimedDays.add(Number(data.day));
                }

                this.notify("รับรางวัลประจำวันสำเร็จ!");

            });

            this.socket.on("daily:error", data => {

                this.notify(
                    data?.message || "ไม่สามารถรับรางวัลได้"
                );

            });

        },

        /* =====================================
           REQUEST DATA
        ===================================== */

        requestSync() {

            if (!this.socket?.connected) return false;

            this.socket.emit("daily:request");

            return true;

        },

        /* =====================================
           GET REWARDS
        ===================================== */

        getAllRewards() {

            return Array.from(this.rewards.values());

        },

        getReward(day) {

            return this.rewards.get(Number(day)) || null;

        },

        getCurrentReward() {

            const nextDay =
                (this.currentStreak % 7) + 1;

            return this.getReward(nextDay);

        },

        /* =====================================
           CLAIM STATUS
        ===================================== */

        hasClaimed(day) {

            return this.claimedDays.has(Number(day));

        },

        canClaim() {

            if (!this.socket?.connected) return false;

            const today = this.getTodayKey();

            return this.lastClaimDate !== today;

        },

        /* =====================================
           CLAIM REWARD
        ===================================== */

        claimReward() {

            if (!this.socket?.connected) {
                return {
                    success: false,
                    message: "ไม่ได้เชื่อมต่อเซิร์ฟเวอร์"
                };
            }

            if (!this.canClaim()) {
                return {
                    success: false,
                    message: "วันนี้รับรางวัลไปแล้ว"
                };
            }

            this.socket.emit("daily:claim");

            return {
                success: true,
                message: "ส่งคำขอรับรางวัลแล้ว"
            };

        },

        /* =====================================
           STREAK
        ===================================== */

        getStreak() {

            return this.currentStreak;

        },

        getNextStreakDay() {

            return (this.currentStreak % 7) + 1;

        },

        getStreakProgress() {

            return (this.currentStreak % 7) / 7 * 100;

        },

        /* =====================================
           DATE
        ===================================== */

        getTodayKey() {

            const now = new Date();

            return [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0")
            ].join("-");

        },

        /* =====================================
           CLAIMED REWARDS
        ===================================== */

        getClaimedDays() {

            return Array.from(this.claimedDays);

        },

        getRemainingDays() {

            return this.getAllRewards().filter(
                reward => !this.hasClaimed(reward.day)
            );

        },

        /* =====================================
           NOTIFICATION
        ===================================== */

        notify(message) {

            console.log("[DailyRewardSystem]", message);

            window.dispatchEvent(
                new CustomEvent("daily:notification", {
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
                    "daily:sync",
                    "daily:claimed",
                    "daily:error"
                ].forEach(event => {
                    this.socket.off(event);
                });

            }

            this.rewards.clear();
            this.claimedDays.clear();

            this.currentStreak = 0;
            this.lastClaimDate = null;
            this.socket = null;
            this.initialized = false;

            console.log("[DailyRewardSystem] Destroyed");

        }

    };

    window.DailyRewardSystem = DailyRewardSystem;

})();
