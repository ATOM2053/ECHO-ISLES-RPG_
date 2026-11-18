/* =========================================
   ECHO ISLES RPG
   Mount System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const mountDatabase = {
        forest_deer: {
            id: "forest_deer",
            name: "Forest Deer",
            type: "Nature",
            rarity: "Common",
            description: "กวางแห่งป่าเอเมอรัลด์",
            speed: 1.15,
            baseStats: {
                stamina: 100,
                health: 100
            }
        },

        royal_horse: {
            id: "royal_horse",
            name: "Royal Horse",
            type: "Normal",
            rarity: "Rare",
            description: "ม้าศึกแห่งอาณาจักร",
            speed: 1.35,
            baseStats: {
                stamina: 150,
                health: 150
            }
        },

        frost_wolf: {
            id: "frost_wolf",
            name: "Frost Wolf",
            type: "Ice",
            rarity: "Epic",
            description: "หมาป่าน้ำแข็งจากฟรอสต์ฟอลล์",
            speed: 1.5,
            baseStats: {
                stamina: 180,
                health: 180
            }
        },

        shadow_panther: {
            id: "shadow_panther",
            name: "Shadow Panther",
            type: "Dark",
            rarity: "Epic",
            description: "เสือดำแห่งเงามืด",
            speed: 1.65,
            baseStats: {
                stamina: 160,
                health: 160
            }
        },

        ancient_dragon: {
            id: "ancient_dragon",
            name: "Ancient Dragon",
            type: "Dragon",
            rarity: "Legendary",
            description: "มังกรโบราณผู้ยิ่งใหญ่",
            speed: 2.0,
            baseStats: {
                stamina: 300,
                health: 300
            }
        }
    };

    const mounts = new Map();

    let activeMountId = null;

    function createMount(mountId) {
        const template = mountDatabase[mountId];

        if (!template) {
            return {
                success: false,
                message: "ไม่พบพาหนะ"
            };
        }

        if (mounts.has(mountId)) {
            return {
                success: false,
                message: "คุณมีพาหนะนี้แล้ว"
            };
        }

        const mount = {
            id: template.id,
            name: template.name,
            type: template.type,
            rarity: template.rarity,
            description: template.description,

            level: 1,
            exp: 0,

            speed: template.speed,

            stamina: template.baseStats.stamina,
            maxStamina: template.baseStats.stamina,

            health: template.baseStats.health,
            maxHealth: template.baseStats.health,

            summoned: false,
            unlocked: true
        };

        mounts.set(mountId, mount);

        return {
            success: true,
            mount
        };
    }

    function getMount(mountId) {
        return mounts.get(mountId) || null;
    }

    function getAllMounts() {
        return Array.from(mounts.values());
    }

    function getMountDatabase() {
        return Object.values(mountDatabase);
    }

    function getRequiredExp(level) {
        return Math.floor(150 * Math.pow(level, 1.5));
    }

    function addExperience(mountId, amount) {
        const mount = getMount(mountId);

        if (!mount) {
            return {
                success: false,
                message: "ไม่พบพาหนะ"
            };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                success: false,
                message: "จำนวน EXP ไม่ถูกต้อง"
            };
        }

        if (mount.level >= 100) {
            return {
                success: false,
                message: "พาหนะมีเลเวลสูงสุดแล้ว"
            };
        }

        mount.exp += Math.floor(amount);

        let leveledUp = false;

        while (
            mount.level < 100 &&
            mount.exp >= getRequiredExp(mount.level)
        ) {
            mount.exp -= getRequiredExp(mount.level);

            mount.level++;

            mount.maxStamina += 10;
            mount.maxHealth += 10;

            mount.stamina = mount.maxStamina;
            mount.health = mount.maxHealth;

            mount.speed += 0.01;

            leveledUp = true;
        }

        return {
            success: true,
            level: mount.level,
            exp: mount.exp,
            requiredExp: getRequiredExp(mount.level),
            speed: mount.speed,
            leveledUp
        };
    }

    function summonMount(mountId) {
        const mount = getMount(mountId);

        if (!mount) {
            return {
                success: false,
                message: "ไม่พบพาหนะ"
            };
        }

        if (mount.health <= 0) {
            return {
                success: false,
                message: "พาหนะต้องพักฟื้นก่อน"
            };
        }

        if (activeMountId) {
            const previousMount = getMount(activeMountId);

            if (previousMount) {
                previousMount.summoned = false;
            }
        }

        activeMountId = mountId;
        mount.summoned = true;

        return {
            success: true,
            mount
        };
    }

    function dismissMount() {
        if (!activeMountId) {
            return false;
        }

        const mount = getMount(activeMountId);

        if (mount) {
            mount.summoned = false;
        }

        activeMountId = null;

        return true;
    }

    function getActiveMount() {
        return activeMountId
            ? getMount(activeMountId)
            : null;
    }

    function useStamina(amount) {
        const mount = getActiveMount();

        if (!mount) {
            return {
                success: false,
                message: "ไม่ได้เรียกพาหนะ"
            };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                success: false,
                message: "จำนวน Stamina ไม่ถูกต้อง"
            };
        }

        if (mount.stamina < amount) {
            return {
                success: false,
                message: "Stamina ไม่เพียงพอ"
            };
        }

        mount.stamina -= amount;

        return {
            success: true,
            stamina: mount.stamina
        };
    }

    function restoreStamina(mountId, amount) {
        const mount = getMount(mountId);

        if (!mount) {
            return false;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return false;
        }

        mount.stamina = Math.min(
            mount.maxStamina,
            mount.stamina + Math.floor(amount)
        );

        return true;
    }

    function healMount(mountId, amount) {
        const mount = getMount(mountId);

        if (!mount) {
            return false;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return false;
        }

        mount.health = Math.min(
            mount.maxHealth,
            mount.health + Math.floor(amount)
        );

        return true;
    }

    function getMountStats(mountId) {
        const mount = getMount(mountId);

        if (!mount) {
            return null;
        }

        return {
            level: mount.level,
            exp: mount.exp,

            speed: mount.speed,

            stamina: mount.stamina,
            maxStamina: mount.maxStamina,

            health: mount.health,
            maxHealth: mount.maxHealth
        };
    }

    function removeMount(mountId) {
        const mount = getMount(mountId);

        if (!mount) {
            return false;
        }

        if (activeMountId === mountId) {
            dismissMount();
        }

        mounts.delete(mountId);

        return true;
    }

    function reset() {
        mounts.clear();
        activeMountId = null;
    }

    window.MountSystem = {
        init() {
            console.log("[MountSystem] Initialized");
        },

        createMount,
        getMount,
        getAllMounts,
        getMountDatabase,

        addExperience,

        summonMount,
        dismissMount,
        getActiveMount,

        useStamina,
        restoreStamina,
        healMount,

        getMountStats,
        removeMount,
        reset
    };

})();
