/* =========================================
   ECHO ISLES RPG
   Pet System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const petDatabase = {
        forest_fox: {
            id: "forest_fox",
            name: "Forest Fox",
            type: "Nature",
            rarity: "Common",
            description: "สุนัขจิ้งจอกแห่งป่า",
            baseStats: {
                hp: 100,
                attack: 8,
                defense: 5
            },
            skills: ["Nature Blessing"]
        },

        crystal_wolf: {
            id: "crystal_wolf",
            name: "Crystal Wolf",
            type: "Ice",
            rarity: "Rare",
            description: "หมาป่าคริสตัลน้ำแข็ง",
            baseStats: {
                hp: 180,
                attack: 18,
                defense: 12
            },
            skills: ["Ice Fang"]
        },

        flame_dragon: {
            id: "flame_dragon",
            name: "Flame Dragon",
            type: "Fire",
            rarity: "Legendary",
            description: "มังกรเพลิงโบราณ",
            baseStats: {
                hp: 300,
                attack: 35,
                defense: 20
            },
            skills: ["Flame Breath"]
        },

        moon_rabbit: {
            id: "moon_rabbit",
            name: "Moon Rabbit",
            type: "Light",
            rarity: "Rare",
            description: "กระต่ายแห่งแสงจันทร์",
            baseStats: {
                hp: 120,
                attack: 10,
                defense: 8
            },
            skills: ["Moonlight Heal"]
        },

        shadow_cat: {
            id: "shadow_cat",
            name: "Shadow Cat",
            type: "Dark",
            rarity: "Epic",
            description: "แมวแห่งเงามืด",
            baseStats: {
                hp: 150,
                attack: 25,
                defense: 10
            },
            skills: ["Shadow Strike"]
        }
    };

    const pets = new Map();

    let activePetId = null;

    function createPet(petId) {
        const template = petDatabase[petId];

        if (!template) {
            return {
                success: false,
                message: "ไม่พบสัตว์เลี้ยง"
            };
        }

        if (pets.has(petId)) {
            return {
                success: false,
                message: "คุณมีสัตว์เลี้ยงตัวนี้แล้ว"
            };
        }

        const pet = {
            id: template.id,
            name: template.name,
            type: template.type,
            rarity: template.rarity,
            description: template.description,

            level: 1,
            exp: 0,

            hp: template.baseStats.hp,
            maxHp: template.baseStats.hp,

            attack: template.baseStats.attack,
            defense: template.baseStats.defense,

            skills: [...template.skills],

            happiness: 100,
            hunger: 0,

            summoned: false,
            unlocked: true
        };

        pets.set(petId, pet);

        return {
            success: true,
            pet
        };
    }

    function getPet(petId) {
        return pets.get(petId) || null;
    }

    function getAllPets() {
        return Array.from(pets.values());
    }

    function getPetDatabase() {
        return Object.values(petDatabase);
    }

    function getRequiredExp(level) {
        return Math.floor(100 * Math.pow(level, 1.5));
    }

    function addExperience(petId, amount) {
        const pet = getPet(petId);

        if (!pet) {
            return {
                success: false,
                message: "ไม่พบสัตว์เลี้ยง"
            };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                success: false,
                message: "จำนวน EXP ไม่ถูกต้อง"
            };
        }

        if (pet.level >= 100) {
            return {
                success: false,
                message: "สัตว์เลี้ยงมีเลเวลสูงสุดแล้ว"
            };
        }

        pet.exp += Math.floor(amount);

        let leveledUp = false;

        while (
            pet.level < 100 &&
            pet.exp >= getRequiredExp(pet.level)
        ) {
            pet.exp -= getRequiredExp(pet.level);
            pet.level++;

            pet.maxHp += 10;
            pet.attack += 2;
            pet.defense += 1;

            pet.hp = pet.maxHp;

            leveledUp = true;
        }

        return {
            success: true,
            level: pet.level,
            exp: pet.exp,
            requiredExp: getRequiredExp(pet.level),
            leveledUp
        };
    }

    function summonPet(petId) {
        const pet = getPet(petId);

        if (!pet) {
            return {
                success: false,
                message: "ไม่พบสัตว์เลี้ยง"
            };
        }

        if (pet.hp <= 0) {
            return {
                success: false,
                message: "สัตว์เลี้ยงต้องพักฟื้นก่อน"
            };
        }

        if (activePetId) {
            const previousPet = getPet(activePetId);

            if (previousPet) {
                previousPet.summoned = false;
            }
        }

        activePetId = petId;
        pet.summoned = true;

        return {
            success: true,
            pet
        };
    }

    function dismissPet() {
        if (!activePetId) {
            return false;
        }

        const pet = getPet(activePetId);

        if (pet) {
            pet.summoned = false;
        }

        activePetId = null;

        return true;
    }

    function getActivePet() {
        return activePetId
            ? getPet(activePetId)
            : null;
    }

    function feedPet(petId, foodAmount = 20) {
        const pet = getPet(petId);

        if (!pet) {
            return {
                success: false,
                message: "ไม่พบสัตว์เลี้ยง"
            };
        }

        if (
            !Number.isFinite(foodAmount) ||
            foodAmount <= 0 ||
            foodAmount > 100
        ) {
            return {
                success: false,
                message: "จำนวนอาหารไม่ถูกต้อง"
            };
        }

        pet.hunger = Math.max(0, pet.hunger - foodAmount);
        pet.happiness = Math.min(100, pet.happiness + 10);

        return {
            success: true,
            hunger: pet.hunger,
            happiness: pet.happiness
        };
    }

    function healPet(petId, amount) {
        const pet = getPet(petId);

        if (!pet) {
            return false;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return false;
        }

        pet.hp = Math.min(
            pet.maxHp,
            pet.hp + Math.floor(amount)
        );

        return true;
    }

    function damagePet(petId, amount) {
        const pet = getPet(petId);

        if (!pet) {
            return false;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return false;
        }

        pet.hp = Math.max(
            0,
            pet.hp - Math.floor(amount)
        );

        return true;
    }

    function getPetStats(petId) {
        const pet = getPet(petId);

        if (!pet) {
            return null;
        }

        return {
            hp: pet.hp,
            maxHp: pet.maxHp,
            attack: pet.attack,
            defense: pet.defense,
            level: pet.level,
            exp: pet.exp,
            happiness: pet.happiness,
            hunger: pet.hunger
        };
    }

    function removePet(petId) {
        const pet = getPet(petId);

        if (!pet) {
            return false;
        }

        if (activePetId === petId) {
            dismissPet();
        }

        pets.delete(petId);

        return true;
    }

    function reset() {
        pets.clear();
        activePetId = null;
    }

    window.PetSystem = {
        init() {
            console.log("[PetSystem] Initialized");
        },

        createPet,
        getPet,
        getAllPets,
        getPetDatabase,

        addExperience,

        summonPet,
        dismissPet,
        getActivePet,

        feedPet,
        healPet,
        damagePet,

        getPetStats,
        removePet,
        reset
    };

})();
