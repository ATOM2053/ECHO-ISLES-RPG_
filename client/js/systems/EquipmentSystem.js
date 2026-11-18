/* =========================================
   ECHO ISLES RPG
   Equipment System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const equipment = new Map();

    const EQUIPMENT_SLOTS = [
        "weapon",
        "helmet",
        "armor",
        "gloves",
        "boots",
        "necklace",
        "ring",
        "accessory"
    ];

    // =====================================
    // EQUIPMENT DATABASE
    // =====================================

    const EQUIPMENT_DATABASE = {

        wooden_sword: {
            id: "wooden_sword",
            name: "Wooden Sword",
            slot: "weapon",
            rarity: "common",
            levelRequired: 1,
            stats: {
                attack: 5
            }
        },

        iron_sword: {
            id: "iron_sword",
            name: "Iron Sword",
            slot: "weapon",
            rarity: "uncommon",
            levelRequired: 5,
            stats: {
                attack: 15,
                critical: 2
            }
        },

        leather_helmet: {
            id: "leather_helmet",
            name: "Leather Helmet",
            slot: "helmet",
            rarity: "common",
            levelRequired: 1,
            stats: {
                defense: 3
            }
        },

        leather_armor: {
            id: "leather_armor",
            name: "Leather Armor",
            slot: "armor",
            rarity: "common",
            levelRequired: 1,
            stats: {
                defense: 5,
                hp: 10
            }
        },

        leather_gloves: {
            id: "leather_gloves",
            name: "Leather Gloves",
            slot: "gloves",
            rarity: "common",
            levelRequired: 1,
            stats: {
                attack: 2
            }
        },

        leather_boots: {
            id: "leather_boots",
            name: "Leather Boots",
            slot: "boots",
            rarity: "common",
            levelRequired: 1,
            stats: {
                defense: 2
            }
        },

        ruby_necklace: {
            id: "ruby_necklace",
            name: "Ruby Necklace",
            slot: "necklace",
            rarity: "rare",
            levelRequired: 10,
            stats: {
                hp: 30,
                attack: 5
            }
        },

        silver_ring: {
            id: "silver_ring",
            name: "Silver Ring",
            slot: "ring",
            rarity: "uncommon",
            levelRequired: 5,
            stats: {
                defense: 3,
                critical: 2
            }
        },

        adventurer_badge: {
            id: "adventurer_badge",
            name: "Adventurer Badge",
            slot: "accessory",
            rarity: "common",
            levelRequired: 1,
            stats: {
                hp: 5,
                mp: 5
            }
        }
    };

    // =====================================
    // CREATE EQUIPMENT
    // =====================================

    function createEquipment(playerId) {

        if (!playerId) return false;

        if (equipment.has(playerId)) {
            return equipment.get(playerId);
        }

        const slots = {};

        for (const slot of EQUIPMENT_SLOTS) {
            slots[slot] = null;
        }

        const data = {
            playerId,
            slots
        };

        equipment.set(playerId, data);

        return data;
    }

    function getEquipment(playerId) {
        return equipment.get(playerId) || null;
    }

    function getEquipmentSlots() {
        return [...EQUIPMENT_SLOTS];
    }

    // =====================================
    // REGISTER EQUIPMENT
    // =====================================

    function registerEquipment(item) {

        if (!item || !item.id || !EQUIPMENT_SLOTS.includes(item.slot)) {
            return false;
        }

        EQUIPMENT_DATABASE[item.id] = {
            ...item,
            stats: {
                ...(item.stats || {})
            }
        };

        return true;
    }

    function getEquipmentItem(itemId) {
        return EQUIPMENT_DATABASE[itemId] || null;
    }

    function getAllEquipment() {
        return Object.values(EQUIPMENT_DATABASE);
    }

    // =====================================
    // EQUIP ITEM
    // =====================================

    function equipItem(playerId, itemId) {

        const player = window.ECHO_GAME?.player;

        if (!player || player.id !== playerId) {
            return {
                success: false,
                message: "ไม่พบตัวละคร"
            };
        }

        const inventory = window.InventorySystem;

        if (!inventory || !inventory.hasItem(playerId, itemId)) {
            return {
                success: false,
                message: "คุณไม่มีไอเทมนี้"
            };
        }

        const item = getEquipmentItem(itemId);

        if (!item) {
            return {
                success: false,
                message: "ไอเทมนี้ไม่สามารถสวมใส่ได้"
            };
        }

        if ((player.level || 1) < (item.levelRequired || 1)) {
            return {
                success: false,
                message: "ระดับตัวละครไม่เพียงพอ"
            };
        }

        const data = createEquipment(playerId);
        const oldItem = data.slots[item.slot];

        const removed = inventory.removeItem(playerId, itemId, 1);

        if (!removed
