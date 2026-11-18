/* =========================================
   ECHO ISLES RPG
   Inventory System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const inventories = new Map();

    const DEFAULT_CAPACITY = 40;
    const MAX_STACK = 999;

    // =====================================
    // ITEM DATABASE
    // =====================================

    const ITEMS = {

        health_potion: {
            id: "health_potion",
            name: "Health Potion",
            description: "ฟื้นฟู HP จำนวน 50 หน่วย",
            type: "consumable",
            rarity: "common",
            stackable: true,
            maxStack: 99,
            value: 15,
            effect: {
                hp: 50
            }
        },

        mana_potion: {
            id: "mana_potion",
            name: "Mana Potion",
            description: "ฟื้นฟู MP จำนวน 50 หน่วย",
            type: "consumable",
            rarity: "common",
            stackable: true,
            maxStack: 99,
            value: 15,
            effect: {
                mp: 50
            }
        },

        slime_gel: {
            id: "slime_gel",
            name: "Slime Gel",
            description: "วัตถุดิบจาก Green Slime",
            type: "material",
            rarity: "common",
            stackable: true,
            maxStack: 999,
            value: 3
        },

        iron_ore: {
            id: "iron_ore",
            name: "Iron Ore",
            description: "แร่เหล็กสำหรับการตีอาวุธ",
            type: "material",
            rarity: "common",
            stackable: true,
            maxStack: 999,
            value: 10
        },

        herb: {
            id: "herb",
            name: "Green Herb",
            description: "สมุนไพรสำหรับปรุงยา",
            type: "material",
            rarity: "common",
            stackable: true,
            maxStack: 999,
            value: 5
        },

        wooden_sword: {
            id: "wooden_sword",
            name: "Wooden Sword",
            description: "ดาบไม้สำหรับนักผจญภัยเริ่มต้น",
            type: "weapon",
            rarity: "common",
            stackable: false,
            maxStack: 1,
            value: 25,
            equipmentSlot: "weapon",
            stats: {
                attack: 5
            }
        },

        leather_armor: {
            id: "leather_armor",
            name: "Leather Armor",
            description: "เกราะหนังสำหรับป้องกัน",
            type: "armor",
            rarity: "common",
            stackable: false,
            maxStack: 1,
            value: 35,
            equipmentSlot: "armor",
            stats: {
                defense: 5
            }
        },

        cooked_meat: {
            id: "cooked_meat",
            name: "Cooked Meat",
            description: "อาหารที่ช่วยฟื้นฟูพลังชีวิต",
            type: "food",
            rarity: "common",
            stackable: true,
            maxStack: 99,
            value: 12,
            effect: {
                hp: 30
            }
        }
    };

    // =====================================
    // CREATE INVENTORY
    // =====================================

    function createInventory(playerId, capacity = DEFAULT_CAPACITY) {

        if (!playerId) return false;

        if (inventories.has(playerId)) {
            return inventories.get(playerId);
        }

        const inventory = {
            playerId,
            capacity: Math.max(1, capacity),
            items: []
        };

        inventories.set(playerId, inventory);

        return inventory;
    }

    function getInventory(playerId) {

        return inventories.get(playerId) || null;
    }

    function getItems(playerId) {

        const inventory = getInventory(playerId);

        if (!inventory) return [];

        return inventory.items.map(item => ({ ...item }));
    }

    function getUsedSlots(playerId) {

        const inventory = getInventory(playerId);

        return inventory ? inventory.items.length : 0;
    }

    function getFreeSlots(playerId) {

        const inventory = getInventory(playerId);

        if (!inventory) return 0;

        return inventory.capacity - inventory.items.length;
    }

    // =====================================
    // ITEM DATABASE
    // =====================================

    function registerItem(itemData) {

        if (!itemData || !itemData.id) {
            return false;
        }

        ITEMS[itemData.id] = {
            ...itemData
        };

        return true;
    }

    function getItem(itemId) {

        return ITEMS[itemId] || null;
    }

    function getAllItems() {

        return Object.values(ITEMS);
    }

    // =====================================
    // ADD ITEM
    // =====================================

    function addItem(playerId, itemId, amount = 1) {

        const inventory = getInventory(playerId);

        const item = getItem(itemId);

        amount = Math.floor(Number(amount));

        if (!inventory || !item || !Number.isFinite(amount) || amount <= 0) {
            return {
                success: false,
                message: "ข้อมูลไอเทมไม่ถูกต้อง"
            };
        }

        const maxStack = item.stackable
            ? (item.maxStack || MAX_STACK)
            : 1;

        const existingStacks = inventory.items.filter(
            entry => entry.itemId === itemId
        );

        if (item.stackable) {

            let remaining = amount;

            for (const stack of existingStacks) {

                const available = maxStack - stack.amount;

                if (available <= 0) continue;

                const added = Math.min(available, remaining);

                stack.amount += added;
                remaining -= added;

                if (remaining <= 0) break;
            }

            while (remaining > 0) {

                if (inventory.items.length >= inventory.capacity) {
                    return {
                        success: false,
                        added: amount - remaining,
                        remaining,
                        message: "กระเป๋าเต็ม"
                    };
                }

                const added = Math.min(maxStack, remaining);

                inventory.items.push({
                    instanceId: createInstanceId(),
                    itemId,
                    amount: added
                });

                remaining -= added;
            }

        } else {

            if (amount > inventory.capacity - inventory.items.length) {
                return {
                    success: false,
                    added: inventory.capacity - inventory.items.length,
                    message: "พื้นที่ในกระเป๋าไม่เพียงพอ"
                };
            }

            for (let i = 
