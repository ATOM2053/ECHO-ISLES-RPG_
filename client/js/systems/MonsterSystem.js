/* =========================================
   ECHO ISLES RPG
   Monster System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const monsters = new Map();

    const MONSTER_TYPES = {
        slime: {
            name: "Green Slime",
            level: 1,
            hp: 50,
            attack: 5,
            defense: 1,
            exp: 10,
            gold: 3,
            aggroRange: 120,
            respawnTime: 10000,
            type: "normal"
        },

        forest_wolf: {
            name: "Forest Wolf",
            level: 3,
            hp: 120,
            attack: 12,
            defense: 4,
            exp: 25,
            gold: 8,
            aggroRange: 160,
            respawnTime: 15000,
            type: "normal"
        },

        goblin: {
            name: "Goblin",
            level: 5,
            hp: 200,
            attack: 18,
            defense: 8,
            exp: 45,
            gold: 15,
            aggroRange: 150,
            respawnTime: 20000,
            type: "normal"
        },

        elite_guardian: {
            name: "Ancient Guardian",
            level: 15,
            hp: 2500,
            attack: 65,
            defense: 35,
            exp: 500,
            gold: 150,
            aggroRange: 250,
            respawnTime: 120000,
            type: "elite"
        },

        dragon_boss: {
            name: "Ancient Dragon",
            level: 50,
            hp: 50000,
            attack: 350,
            defense: 150,
            exp: 10000,
            gold: 5000,
            aggroRange: 400,
            respawnTime: 1800000,
            type: "boss"
        }
    };

    // =====================================
    // CREATE MONSTER
    // =====================================

    function createMonster(typeId, options = {}) {

        const template = MONSTER_TYPES[typeId];

        if (!template) {
            console.warn("Monster type not found:", typeId);
            return null;
        }

        const id = options.id ||
            "monster_" + Date.now() + "_" +
            Math.random().toString(36).slice(2, 8);

        const monster = {
            id,
            typeId,

            name: template.name,
            type: template.type,

            level: template.level,

            hp: template.hp,
            maxHp: template.hp,

            attack: template.attack,
            defense: template.defense,

            exp: template.exp,
            gold: template.gold,

            x: Number.isFinite(options.x) ? options.x : 0,
            y: Number.isFinite(options.y) ? options.y : 0,

            map: options.map || "starting_village",

            state: "idle",
            targetId: null,

            aggroRange: template.aggroRange,
            respawnTime: template.respawnTime,

            alive: true,
            spawnedAt: Date.now(),
            respawnAt: null
        };

        monsters.set(id, monster);

        return monster;
    }

    // =====================================
    // GET MONSTERS
    // =====================================

    function getMonster(id) {
        return monsters.get(id) || null;
    }

    function getAllMonsters() {
        return Array.from(monsters.values());
    }

    function getMonstersByMap(mapId) {
        return getAllMonsters().filter(
            monster => monster.map === mapId
        );
    }

    function getMonstersInRange(x, y, range, mapId) {

        return getAllMonsters().filter(monster => {

            if (!monster.alive) return false;

            if (mapId && monster.map !== mapId) {
                return false;
            }

            const dx = monster.x - x;
            const dy = monster.y - y;

            return Math.sqrt(dx * dx + dy * dy) <= range;
        });
    }

    // =====================================
    // MONSTER HEALTH
    // =====================================

    function damageMonster(id, damage) {

        const monster = getMonster(id);

        if (!monster || !monster.alive) {
            return false;
        }

        const amount = Math.max(
            0,
            Math.floor(Number(damage) || 0)
        );

        monster.hp = Math.max(
            0,
            monster.hp - amount
        );

        if (monster.hp <= 0) {
            defeatMonster(id);
        }

        return monster.hp;
    }

    function healMonster(id, amount) {

        const monster = getMonster(id);

        if (!monster || !monster.alive) {
            return false;
        }

        monster.hp = Math.min(
            monster.maxHp,
            monster.hp + Math.max(0, amount)
        );

        return monster.hp;
    }

    // =====================================
    // DEFEAT MONSTER
    // =====================================

    function defeatMonster(id) {

        const monster = getMonster(id);

        if (!monster || !monster.alive) {
            return false;
        }

        monster.hp = 0;
        monster.alive = false;
        monster.state = "dead";
        monster.targetId = null;

        monster.respawnAt =
            Date.now() + monster.respawnTime;

        return {
            id: monster.id,
            name: monster.name,
            exp: monster.exp,
            gold: monster.gold,
            respawnAt: monster.respawnAt
        };
    }

    // =====================================
    // RESPAWN
    // =====================================

    function respawnMonster(id) {

        const monster = getMonster(id);

        if (!monster || monster.alive) {
            return false;
        }

        monster.hp = monster.maxHp;
        monster.alive = true;

        monster.state = "idle";
        monster.targetId = null;

        monster.respawnAt = null;
        monster.spawnedAt = Date.now();

        return true;
    }

    function updateRespawns() {

        const now = Date.now();

        for (const monster of monsters.values()) {

            if (
                !monster.alive &&
                monster.respawnAt &&
                now >= monster.respawnAt
            ) {
                respawnMonster(monster.id);
            }
        }
    }

    // =====================================
    // MONSTER AI STATE
    // =====================================

    function setMonsterState(id, state) {

        const monster = getMonster(id);

        if (!monster || !monster.alive) {
            return false;
        }

        const validStates = [
            "idle",
            "patrol",
            "chase",
            "attack",
            "return",
            "dead"
        ];

        if (!validStates.includes(state)) {
            return false;
        }

        monster.state = state;

        return true;
    }

    function setTarget(id, targetId) {

        const monster = getMonster(id);

        if (!monster || !monster.alive) {
            return false;
        }

        monster.targetId = targetId || null;

        monster.state = targetId
            ? "chase"
            : "idle";

        return true;
    }

    function clearTarget(id) {

        const monster = getMonster(id);

        if (!monster) return false;

        monster.targetId = null;
        monster.state = "idle";

        return true;
    }

    // =====================================
    // MONSTER AI UPDATE
    // =====================================

    function updateAI(players = []) {

        for (const monster of monsters.values()) {

            if (!monster.alive) continue;

            if (
                monster.state !== "idle" &&
                monster.state !== "patrol"
            ) {
                continue;
            }

            let nearestPlayer = null;
            let nearestDistance = Infinity;

            for (const player of players) {

                if (
                    !player ||
                    player.hp <= 0 ||
                    player.map !== monster.map
                ) {
                    continue;
                }

                const dx = player.x - monster.x;
                const dy = player.y - monster.y;

                const distance = Math.sqrt(
                    dx * dx + dy * dy
                );

                if (
                    distance <= monster.aggroRange &&
                    distance < nearestDistance
                ) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            }

            if (nearestPlayer) {
                monster.targetId = nearestPlayer.id;
                monster.state = "chase";
            }
        }
    }

    // =====================================
    // REMOVE MONSTER
    // =====================================

    function removeMonster(id) {
        return monsters.delete(id);
    }

    function clearMonsters() {
        monsters.clear();
    }

    // =====================================
    // MONSTER TEMPLATES
    // =====================================

    function getMonsterTypes() {
        return Object.keys(MONSTER_TYPES);
    }

    function getMonsterTemplate(typeId) {
        return MONSTER_TYPES[typeId] || null;
    }

    // =====================================
    // UPDATE
    // =====================================

    function update(deltaTime, players = []) {

        updateRespawns();
        updateAI(players);
    }

    // =====================================
    // PUBLIC API
    // =====================================

    window.MonsterSystem = {

        init: function () {
            console.log("MonsterSystem initialized");
        },

        createMonster,
        getMonster,
        getAllMonsters,
        getMonstersByMap,
        getMonstersInRange,

        damageMonster,
        healMonster,
        defeatMonster,

        respawnMonster,
        updateRespawns,

        setMonsterState,
        setTarget,
        clearTarget,
        updateAI,

        removeMonster,
        clearMonsters,

        getMonsterTypes,
        getMonsterTemplate,

        update
    };

    console.log("ECHO ISLES Monster System loaded");

})();
