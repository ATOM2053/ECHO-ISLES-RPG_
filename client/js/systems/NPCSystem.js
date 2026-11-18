/* =========================================
   ECHO ISLES RPG
   NPC System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const npcs = new Map();

    let selectedNPC = null;

    const NPC_TYPES = {
        merchant: {
            name: "Merchant",
            role: "พ่อค้า",
            interaction: "shop"
        },

        blacksmith: {
            name: "Blacksmith",
            role: "ช่างตีเหล็ก",
            interaction: "blacksmith"
        },

        alchemist: {
            name: "Alchemist",
            role: "นักเล่นแร่แปรธาตุ",
            interaction: "alchemy"
        },

        chef: {
            name: "Chef",
            role: "เชฟ",
            interaction: "cooking"
        },

        trainer: {
            name: "Trainer",
            role: "ครูฝึก",
            interaction: "training"
        },

        quest_giver: {
            name: "Quest Giver",
            role: "ผู้มอบภารกิจ",
            interaction: "quest"
        },

        innkeeper: {
            name: "Innkeeper",
            role: "เจ้าของโรงเตี๊ยม",
            interaction: "inn"
        },

        guard: {
            name: "Kingdom Guard",
            role: "ทหารยาม",
            interaction: "guard"
        },

        fisherman: {
            name: "Fisherman",
            role: "ชาวประมง",
            interaction: "fishing"
        },

        banker: {
            name: "Banker",
            role: "นายธนาคาร",
            interaction: "bank"
        }
    };

    // =====================================
    // CREATE NPC
    // =====================================

    function createNPC(typeId, options = {}) {

        const template = NPC_TYPES[typeId];

        if (!template) {
            console.warn("NPC type not found:", typeId);
            return null;
        }

        const id = options.id ||
            "npc_" + Date.now() + "_" +
            Math.random().toString(36).slice(2, 8);

        const npc = {
            id,

            name: options.name || template.name,
            role: template.role,
            type: typeId,

            interaction: template.interaction,

            x: Number.isFinite(options.x)
                ? options.x
                : 0,

            y: Number.isFinite(options.y)
                ? options.y
                : 0,

            map: options.map || "starting_village",

            direction: options.direction || "down",

            dialogue: options.dialogue || [],

            quests: options.quests || [],

            shopItems: options.shopItems || [],

            available: true
        };

        npcs.set(id, npc);

        return npc;
    }

    // =====================================
    // NPC DATABASE
    // =====================================

    function createDefaultNPCs() {

        const defaults = [
            {
                id: "npc_village_merchant",
                type: "merchant",
                name: "Marcus",
                x: 350,
                y: 250,
                map: "starting_village"
            },
            {
                id: "npc_village_blacksmith",
                type: "blacksmith",
                name: "Thor",
                x: 500,
                y: 300,
                map: "starting_village"
            },
            {
                id: "npc_village_chef",
                type: "chef",
                name: "Martha",
                x: 600,
                y: 350,
                map: "starting_village"
            },
            {
                id: "npc_village_trainer",
                type: "trainer",
                name: "Leon",
                x: 450,
                y: 450,
                map: "starting_village"
            },
            {
                id: "npc_village_quest",
                type: "quest_giver",
                name: "Elder Rowan",
                x: 300,
                y: 400,
                map: "starting_village"
            },
            {
                id: "npc_village_innkeeper",
                type: "innkeeper",
                name: "Elena",
                x: 700,
                y: 300,
                map: "starting_village"
            }
        ];

        for (const data of defaults) {

            if (npcs.has(data.id)) continue;

            createNPC(data.type, data);
        }
    }

    // =====================================
    // GET NPC
    // =====================================

    function getNPC(id) {
        return npcs.get(id) || null;
    }

    function getAllNPCs() {
        return Array.from(npcs.values());
    }

    function getNPCsByMap(mapId) {

        return getAllNPCs().filter(
            npc => npc.map === mapId
        );
    }

    // =====================================
    // NPC DISTANCE
    // =====================================

    function getDistance(player, npc) {

        const dx = player.x - npc.x;
        const dy = player.y - npc.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    function getNearbyNPCs(player, range = 100) {

        if (!player) return [];

        return getAllNPCs().filter(npc => {

            if (!npc.available) return false;

            if (npc.map !== player.map) {
                return false;
            }

            return getDistance(player, npc) <= range;
        });
    }

    // =====================================
    // NPC INTERACTION
    // =====================================

    function interact(player, npcId, range = 100) {

        if (!player) {
            return {
                success: false,
                message: "ไม่พบข้อมูลผู้เล่น"
            };
        }

        const npc = getNPC(npcId);

        if (!npc || !npc.available) {
            return {
                success: false,
                message: "ไม่พบ NPC"
            };
        }

        if (player.map !== npc.map) {
            return {
                success: false,
                message: "NPC อยู่คนละแผนที่"
            };
        }

        if (getDistance(player, npc) > range) {
            return {
                success: false,
                message: "คุณอยู่ไกลจาก NPC เกินไป"
            };
        }

        selectedNPC = npc.id;

        return {
            success: true,
            npc,
            interaction: npc.interaction
        };
    }

    function getSelectedNPC() {

        if (!selectedNPC) return null;

        return getNPC(selectedNPC);
    }

    function closeInteraction() {
        selectedNPC = null;
    }

    // =====================================
    // NPC DIALOGUE
    // =====================================

    function setDialogue(npcId, dialogue) {

        const npc = getNPC(npcId);

        if (!npc || !Array.isArray(dialogue)) {
            return false;
        }

        npc.dialogue = dialogue;

        return true;
    }

    function getDialogue(npcId) {

        const npc = getNPC(npcId);

        if (!npc) return [];

        return [...npc.dialogue];
    }

    // =====================================
    // NPC QUESTS
    // =====================================

    function addQuest(npcId, questId) {

        const npc = getNPC(npcId);

        if (!npc || !questId) {
            return false;
        }

        if (!npc.quests.includes(questId)) {
            npc.quests.push(questId);
        }

        return true;
    }

    function getQuests(npcId) {

        const npc = getNPC(npcId);

        return npc ? [...npc.quests] : [];
    }

    // =====================================
    // NPC SHOP
    // =====================================

    function setShopItems(npcId, items) {

        const npc = getNPC(npcId);

        if (
            !npc ||
            !Array.isArray(items) ||
            npc.interaction !== "shop"
        ) {
            return false;
        }

        npc.shopItems = items;

        return true;
    }

    function getShopItems(npcId) {

        const npc = getNPC(npcId);

        if (!npc || npc.interaction !== "shop") {
            return [];
        }

        return [...npc.shopItems];
    }

    // =====================================
    // NPC MOVEMENT
    // =====================================

    function setPosition(npcId, x, y) {

        const npc = getNPC(npcId);

        if (
            !npc ||
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            return false;
        }

        npc.x = x;
        npc.y = y;

        return true;
    }

    function setAvailability(npcId, available) {

        const npc = getNPC(npcId);

        if (!npc) return false;

        npc.available = Boolean(available);

        return true;
    }

    // =====================================
    // REMOVE NPC
    // =====================================

    function removeNPC(npcId) {

        if (selectedNPC === npcId) {
            selectedNPC = null;
        }

        return npcs.delete(npcId);
    }

    function clearNPCs() {

        npcs.clear();
        selectedNPC = null;
    }

    // =====================================
    // NPC TYPES
    // =====================================

    function getNPCTypes() {
        return Object.keys(NPC_TYPES);
    }

    function getNPCTemplate(typeId) {
        return NPC_TYPES[typeId] || null;
    }

    // =====================================
    // PUBLIC API
    // =====================================

    window.NPCSystem = {

        createNPC,
        createDefaultNPCs,

        getNPC,
        getAllNPCs,
        getNPCsByMap,

        getNearbyNPCs,
        getDistance,

        interact,
        getSelectedNPC,
        closeInteraction,

        setDialogue,
        getDialogue,

        addQuest,
        getQuests,

        setShopItems,
        getShopItems,

        setPosition,
        setAvailability,

        removeNPC,
        clearNPCs,

        getNPCTypes,
        getNPCTemplate
    };

    console.log("ECHO ISLES NPC System loaded");

})();
