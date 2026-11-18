/* =========================================
   ECHO ISLES RPG
   Profession System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const professions = {
        Blacksmith: {
            name: "Blacksmith",
            title: "ช่างตีเหล็ก",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "ผลิตอาวุธและชุดเกราะ"
        },

        Alchemist: {
            name: "Alchemist",
            title: "นักปรุงยา",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "ปรุงยาและน้ำยาวิเศษ"
        },

        Chef: {
            name: "Chef",
            title: "พ่อครัว",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "ทำอาหารและอาหารเพิ่มพลัง"
        },

        Tailor: {
            name: "Tailor",
            title: "ช่างตัดเย็บ",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "ผลิตเสื้อผ้าและเครื่องแต่งกาย"
        },

        Miner: {
            name: "Miner",
            title: "นักขุดแร่",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "ขุดแร่และแร่หายาก"
        },

        Fisher: {
            name: "Fisher",
            title: "นักตกปลา",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "จับปลาและสัตว์น้ำ"
        },

        Herbalist: {
            name: "Herbalist",
            title: "นักเก็บสมุนไพร",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "เก็บสมุนไพรและพืชหายาก"
        },

        Woodcutter: {
            name: "Woodcutter",
            title: "นักตัดไม้",
            level: 1,
            exp: 0,
            maxLevel: 100,
            description: "เก็บไม้และทรัพยากรจากต้นไม้"
        }
    };

    const recipes = {

        iron_sword: {
            name: "Iron Sword",
            profession: "Blacksmith",
            requiredLevel: 5,
            materials: {
                iron_ore: 5,
                wood: 2
            },
            result: {
                id: "iron_sword",
                amount: 1
            },
            exp: 35
        },

        health_potion: {
            name: "Health Potion",
            profession: "Alchemist",
            requiredLevel: 1,
            materials: {
                herb: 3
            },
            result: {
                id: "health_potion",
                amount: 1
            },
            exp: 15
        },

        cooked_meat: {
            name: "Cooked Meat",
            profession: "Chef",
            requiredLevel: 1,
            materials: {
                raw_meat: 2
            },
            result: {
                id: "cooked_meat",
                amount: 1
            },
            exp: 12
        },

        leather_armor: {
            name: "Leather Armor",
            profession: "Tailor",
            requiredLevel: 3,
            materials: {
                leather: 5,
                thread: 2
            },
            result: {
                id: "leather_armor",
                amount: 1
            },
            exp: 25
        }
    };

    const gatheringResources = {

        iron_ore: {
            name: "Iron Ore",
            profession: "Miner",
            exp: 10,
            requiredLevel: 1
        },

        fish: {
            name: "Fish",
            profession: "Fisher",
            exp: 10,
            requiredLevel: 1
        },

        herb: {
            name: "Herb",
            profession: "Herbalist",
            exp: 8,
            requiredLevel: 1
        },

        wood: {
            name: "Wood",
            profession: "Woodcutter",
            exp: 8,
            requiredLevel: 1
        }
    };

    function getInventory() {
        if (!window.InventorySystem) {
            return null;
        }

        return window.InventorySystem;
    }

    function getProfession(name) {
        return professions[name] || null;
    }

    function getAllProfessions() {
        return Object.values(professions);
    }

    function getRequiredExp(level) {
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    function addExperience(name, amount) {
        const profession = getProfession(name);

        if (!profession) {
            return {
                success: false,
                message: "ไม่พบอาชีพ"
            };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                success: false,
                message: "จำนวน EXP ไม่ถูกต้อง"
            };
        }

        if (profession.level >= profession.maxLevel) {
            return {
                success: false,
                message: "อาชีพนี้มีเลเวลสูงสุดแล้ว"
            };
        }

        profession.exp += Math.floor(amount);

        let leveledUp = false;

        while (
            profession.level < profession.maxLevel &&
            profession.exp >= getRequiredExp(profession.level)
        ) {
            profession.exp -= getRequiredExp(profession.level);
            profession.level++;
            leveledUp = true;

            console.log(
                `[Profession] ${profession.name} Level ${profession.level}`
            );
        }

        return {
            success: true,
            leveledUp,
            level: profession.level,
            exp: profession.exp,
            requiredExp: getRequiredExp(profession.level)
        };
    }

    function gather(resourceId, amount = 1) {
        const resource = gatheringResources[resourceId];

        if (!resource) {
            return {
                success: false,
                message: "ไม่พบทรัพยากร"
            };
        }

        if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
            return {
                success: false,
                message: "จำนวนทรัพยากรไม่ถูกต้อง"
            };
        }

        const profession = getProfession(resource.profession);

        if (!profession) {
            return {
                success: false,
                message: "ไม่พบข้อมูลอาชีพ"
            };
        }

        if (profession.level < resource.requiredLevel) {
            return {
                success: false,
                message: "เลเวลอาชีพไม่ถึงกำหนด"
            };
        }

        const inventory = getInventory();

        if (!inventory) {
            return {
                success: false,
                message: "ระบบกระเป๋ายังไม่พร้อม"
            };
        }

        const result = inventory.addItem(resourceId, amount);

        if (!result || !result.success) {
            return {
                success: false,
                message: result?.message || "ไม่สามารถเก็บทรัพยากรได้"
            };
        }

        const expResult = addExperience(
            resource.profession,
            resource.exp * amount
        );

        return {
            success: true,
            resource: resource.name,
            amount,
            profession: resource.profession,
            experience: expResult
        };
    }

    function getRecipe(recipeId) {
        return recipes[recipeId] || null;
    }

    function getAllRecipes() {
        return Object.entries(recipes).map(([id, recipe]) => ({
            id,
            ...recipe
        }));
    }

    function canCraft(recipeId) {
        const recipe = getRecipe(recipeId);

        if (!recipe) {
            return {
                success: false,
                message: "ไม่พบสูตรการผลิต"
            };
        }

        const profession = getProfession(recipe.profession);

        if (profession.level < recipe.requiredLevel) {
            return {
                success: false,
                message: "เลเวลอาชีพไม่ถึงกำหนด",
                requiredLevel: recipe.requiredLevel,
                currentLevel: profession.level
            };
        }

        const inventory = getInventory();

        if (!inventory) {
            return {
                success: false,
                message: "ระบบกระเป๋ายังไม่พร้อม"
            };
        }

        for (const [itemId, amount] of Object.entries(recipe.materials)) {
            if (!inventory.hasItem(itemId, amount)) {
                return {
                    success: false,
                    message: `วัตถุดิบไม่เพียงพอ: ${itemId}`
                };
            }
        }

        return {
            success: true,
            message: "พร้อมผลิตไอเทม"
        };
    }

    function craft(recipeId) {
        const recipe = getRecipe(recipeId);

        const check = canCraft(recipeId);

        if (!check.success) {
            return check;
        }

        const inventory = getInventory();

        // ตรวจสอบวัตถุดิบทั้งหมดก่อนเริ่มใช้
        for (const [itemId, amount] of Object.entries(recipe.materials)) {
            if (!inventory.hasItem(itemId, amount)) {
                return {
                    success: false,
                    message: "วัตถุดิบไม่เพียงพอ"
                };
            }
        }

        // ใช้วัตถุดิบ
        for (const [itemId, amount] of Object.entries(recipe.materials)) {
            const removed = inventory.removeItem(itemId, amount);

            if (!removed || !removed.success) {
                return {
                    success: false,
                    message: "ไม่สามารถใช้วัตถุดิบได้"
                };
            }
        }

        // เพิ่มไอเทมที่ผลิตได้
        const output = inventory.addItem(
            recipe.result.id,
            recipe.result.amount
        );

        if (!output || !output.success) {
            return {
                success: false,
                message: "ไม่สามารถรับไอเทมที่ผลิตได้"
            };
        }

        const experience = addExperience(
            recipe.profession,
            recipe.exp
        );

        return {
            success: true,
            message: "ผลิตไอเทมสำเร็จ",
            item: recipe.result.id,
            amount: recipe.result.amount,
            profession: recipe.profession,
            experience
        };
    }

    function getProfessionStatus(name) {
        const profession = getProfession(name);

        if (!profession) {
            return null;
        }

        return {
            name: profession.name,
            title: profession.title,
            level: profession.level,
            exp: profession.exp,
            requiredExp: getRequiredExp(profession.level),
            maxLevel: profession.maxLevel,
            description: profession.description
        };
    }

    function resetProfession(name) {
        const profession = getProfession(name);

        if (!profession) {
            return false;
        }

        profession.level = 1;
        profession.exp = 0;

        return true;
    }

    window.ProfessionSystem = {
        init() {
            console.log("[ProfessionSystem] Initialized");
        },

        getProfession,
        getAllProfessions,
        getProfessionStatus,
        addExperience,
        gather,
        getRecipe,
        getAllRecipes,
        canCraft,
        craft,
        resetProfession
    };

})();
