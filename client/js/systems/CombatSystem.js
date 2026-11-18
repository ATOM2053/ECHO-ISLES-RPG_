/* =========================================
   ECHO ISLES RPG
   Combat System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const targets = new Map();
    const cooldowns = new Map();
    const activeEffects = [];

    let socket = null;
    let localPlayerId = null;

    const CONFIG = {
        BASIC_ATTACK_COOLDOWN: 500,
        DEFAULT_SKILL_COOLDOWN: 3000,
        TARGET_RANGE: 250,
        CRITICAL_CHANCE: 0.05,
        CRITICAL_MULTIPLIER: 2
    };

    const SKILLS = {
        power_strike: {
            id: "power_strike",
            name: "Power Strike",
            damage: 30,
            cooldown: 4000,
            manaCost: 10,
            range: 100
        },

        fireball: {
            id: "fireball",
            name: "Fireball",
            damage: 45,
            cooldown: 5000,
            manaCost: 20,
            range: 250
        },

        healing_light: {
            id: "healing_light",
            name: "Healing Light",
            healing: 40,
            cooldown: 6000,
            manaCost: 25,
            range: 150
        },

        shadow_strike: {
            id: "shadow_strike",
            name: "Shadow Strike",
            damage: 55,
            cooldown: 5000,
            manaCost: 15,
            range: 120
        }
    };

    // =====================================
    // INITIALIZATION
    // =====================================

    function init(options = {}) {
        socket = options.socket || null;
        localPlayerId = options.playerId || null;

        console.log("CombatSystem initialized");
    }

    function setSocket(newSocket) {
        socket = newSocket;
    }

    function setPlayerId(id) {
        localPlayerId = id;
    }

    // =====================================
    // TARGET SYSTEM
    // =====================================

    function setTarget(targetId) {
        if (!targetId) return false;

        targets.set("local", targetId);

        return true;
    }

    function getTarget() {
        return targets.get("local") || null;
    }

    function clearTarget() {
        targets.delete("local");
    }

    function getTargetData() {
        const targetId = getTarget();

        if (!targetId) return null;

        if (window.PlayerSystem) {
            return window.PlayerSystem.getPlayer(targetId);
        }

        return null;
    }

    // =====================================
    // COOLDOWN SYSTEM
    // =====================================

    function isOnCooldown(actionId) {
        const endTime = cooldowns.get(actionId) || 0;

        return Date.now() < endTime;
    }

    function startCooldown(actionId, duration) {
        cooldowns.set(
            actionId,
            Date.now() + duration
        );
    }

    function getCooldownRemaining(actionId) {
        const endTime = cooldowns.get(actionId) || 0;

        return Math.max(0, endTime - Date.now());
    }

    // =====================================
    // ANIMATION
    // =====================================

    function playAnimation(animationName) {
        if (!window.AnimationSystem || !localPlayerId) {
            return;
        }

        window.AnimationSystem.play(
            localPlayerId,
            animationName,
            { force: true }
        );
    }

    // =====================================
    // BASIC ATTACK
    // =====================================

    function basicAttack() {

        if (isOnCooldown("basic_attack")) {
            return false;
        }

        const targetId = getTarget();

        if (!targetId) {
            return false;
        }

        startCooldown(
            "basic_attack",
            CONFIG.BASIC_ATTACK_COOLDOWN
        );

        playAnimation("attack");

        sendCombatRequest({
            type: "basic_attack",
            targetId
        });

        return true;
    }

    // =====================================
    // SKILL SYSTEM
    // =====================================

    function useSkill(skillId) {

        const skill = SKILLS[skillId];

        if (!skill) {
            console.warn("Unknown skill:", skillId);
            return false;
        }

        if (isOnCooldown(skillId)) {
            return false;
        }

        const targetId = getTarget();

        if (!targetId) {
            return false;
        }

        startCooldown(
            skillId,
            skill.cooldown
        );

        playAnimation("skill");

        sendCombatRequest({
            type: "skill",
            skillId,
            targetId
        });

        return true;
    }

    function getSkills() {
        return Object.values(SKILLS);
    }

    function getSkill(skillId) {
        return SKILLS[skillId] || null;
    }

    // =====================================
    // DODGE
    // =====================================

    function dodge(direction) {

        if (isOnCooldown("dodge")) {
            return false;
        }

        const validDirections = [
            "up",
            "down",
            "left",
            "right"
        ];

        if (!validDirections.includes(direction)) {
            return false;
        }

        startCooldown("dodge", 2000);

        playAnimation("dodge");

        sendCombatRequest({
            type: "dodge",
            direction
        });

        return true;
    }

    // =====================================
    // DEFEND
    // =====================================

    function defend(enabled = true) {

        sendCombatRequest({
            type: "defend",
            enabled: Boolean(enabled)
        });

        return true;
    }

    // =====================================
    // COMBAT NETWORK
    // =====================================

    function sendCombatRequest(data) {

        if (!socket || !socket.connected) {
            console.warn(
                "Combat request failed: Not connected"
            );

            return false;
        }

        socket.emit("combat:action", {
            ...data,
            timestamp: Date.now()
        });

        return true;
    }

    // =====================================
    // COMBAT EFFECTS
    // =====================================

    function addEffect(effect) {

        if (!effect || !effect.type) {
            return false;
        }

        activeEffects.push({
            ...effect,
            createdAt: Date.now()
        });

        return true;
    }

    function getEffects() {
        return [...activeEffects];
    }

    function clearEffects() {
        activeEffects.length = 0;
    }

    // =====================================
    // UPDATE
    // =====================================

    function update() {

        const now = Date.now();

        for (let i = activeEffects.length - 1; i >= 0; i--) {

            const effect = activeEffects[i];

            if (
                effect.duration &&
                now - effect.createdAt >= effect.duration
            ) {
                activeEffects.splice(i, 1);
            }
        }
    }

    // =====================================
    // PUBLIC API
    // =====================================

    window.CombatSystem = {

        init,
        setSocket,
        setPlayerId,

        setTarget,
        getTarget,
        getTargetData,
        clearTarget,

        basicAttack,
        useSkill,
        getSkills,
        getSkill,

        dodge,
        defend,

        isOnCooldown,
        getCooldownRemaining,

        addEffect,
        getEffects,
        clearEffects,

        update
    };

    console.log("ECHO ISLES Combat System loaded");

})();
