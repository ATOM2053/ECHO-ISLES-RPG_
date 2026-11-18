/* =========================================
   ECHO ISLES RPG
   Quest System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const quests = new Map();
    const activeQuests = new Map();
    const completedQuests = new Set();

    // =====================================
    // QUEST DATABASE
    // =====================================

    const QUEST_DATABASE = {

        village_beginning: {
            id: "village_beginning",
            name: "A New Adventure",
            description: "เริ่มต้นการผจญภัยในหมู่บ้าน",
            type: "main",
            level: 1,
            objectives: [
                {
                    id: "talk_elder",
                    type: "talk",
                    target: "npc_village_quest",
                    description: "พูดคุยกับ Elder Rowan",
                    required: 1,
                    current: 0
                }
            ],
            rewards: {
                exp: 100,
                gold: 50
            }
        },

        slime_hunt: {
            id: "slime_hunt",
            name: "Slime Hunting",
            description: "กำจัด Green Slime จำนวน 5 ตัว",
            type: "side",
            level: 1,
            objectives: [
                {
                    id: "kill_slime",
                    type: "kill",
                    target: "slime",
                    description: "กำจัด Green Slime",
                    required: 5,
                    current: 0
                }
            ],
            rewards: {
                exp: 150,
                gold: 80
            }
        },

        gather_herbs: {
            id: "gather_herbs",
            name: "Herbal Collection",
            description: "เก็บสมุนไพรจำนวน 10 ชิ้น",
            type: "gathering",
            level: 2,
            objectives: [
                {
                    id: "collect_herb",
                    type: "collect",
                    target: "herb",
                    description: "เก็บสมุนไพร",
                    required: 10,
                    current: 0
                }
            ],
            rewards: {
                exp: 200,
                gold: 100
            }
        },

        daily_monsters: {
            id: "daily_monsters",
            name: "Daily Monster Hunt",
            description: "กำจัดมอนสเตอร์ 10 ตัว",
            type: "daily",
            level: 1,
            objectives: [
                {
                    id: "daily_kill",
                    type: "kill",
                    target: "any",
                    description: "กำจัดมอนสเตอร์",
                    required: 10,
                    current: 0
                }
            ],
            rewards: {
                exp: 300,
                gold: 200
            }
        },

        guild_materials: {
            id: "guild_materials",
            name: "Guild Material Supply",
            description: "รวบรวมวัตถุดิบให้กิลด์",
            type: "guild",
            level: 5,
            objectives: [
                {
                    id: "guild_collect",
                    type: "collect",
                    target: "wood",
                    description: "รวบรวมไม้",
                    required: 20,
                    current: 0
                }
            ],
            rewards: {
                exp: 500,
                gold: 300
            }
        }
    };

    // =====================================
    // QUEST REGISTRATION
    // =====================================

    function registerQuest(questData) {

        if (!questData || !questData.id) {
            return false;
        }

        if (!Array.isArray(questData.objectives)) {
            return false;
        }

        quests.set(questData.id, {
            ...questData,
            objectives: questData.objectives.map(objective => ({
                ...objective,
                current: 0
            }))
        });

        return true;
    }

    function loadDefaultQuests() {

        for (const quest of Object.values(QUEST_DATABASE)) {

            if (!quests.has(quest.id)) {
                registerQuest(quest);
            }
        }
    }

    // =====================================
    // QUEST GETTERS
    // =====================================

    function getQuest(questId) {
        return quests.get(questId) || null;
    }

    function getAllQuests() {
        return Array.from(quests.values());
    }

    function getAvailableQuests(playerLevel = 1) {

        return getAllQuests().filter(quest => {

            return (
                quest.level <= playerLevel &&
                !activeQuests.has(quest.id) &&
                !completedQuests.has(quest.id)
            );
        });
    }

    // =====================================
    // ACCEPT QUEST
    // =====================================

    function acceptQuest(questId, playerLevel = 1) {

        const quest = getQuest(questId);

        if (!quest) {
            return {
                success: false,
                message: "ไม่พบภารกิจ"
            };
        }

        if (quest.level > playerLevel) {
            return {
                success: false,
                message: "ระดับของคุณยังไม่เพียงพอ"
            };
        }

        if (completedQuests.has(questId)) {
            return {
                success: false,
                message: "คุณทำภารกิจนี้สำเร็จแล้ว"
            };
        }

        if (activeQuests.has(questId)) {
            return {
                success: false,
                message: "คุณรับภารกิจนี้แล้ว"
            };
        }

        const activeQuest = {
            ...quest,
            objectives: quest.objectives.map(objective => ({
                ...objective,
                current: 0
            })),
            acceptedAt: Date.now(),
            status: "active"
        };

        activeQuests.set(questId, activeQuest);

        return {
            success: true,
            quest: activeQuest,
            message: "รับภารกิจเรียบร้อย"
        };
    }

    // =====================================
    // UPDATE OBJECTIVE
    // =====================================

    function updateObjective(type, target, amount = 1) {

        const results = [];

        for (const quest of activeQuests.values()) {

            if (quest.status !== "active") continue;

            for (const objective of quest.objectives) {

                if (objective.type !== type) continue;

                if (
                    objective.target !== target &&
                    objective.target !== "any"
                ) {
                    continue;
                }

                objective.current = Math.min(
                    objective.required,
                    objective.current + Math.max(0, amount)
                );

                results.push({
                    questId: quest.id,
                    objectiveId: objective.id,
                    current: objective.current,
                    required: objective.required
                });
            }

            if (isQuestCompleted(quest.id)) {
                quest.status = "ready_to_claim";
            }
        }

        return results;
    }

    // =====================================
    // OBJECTIVE HELPERS
    // =====================================

    function isObjectiveCompleted(objective) {

        return objective.current >= objective.required;
    }

    function isQuestCompleted(questId) {

        const quest = activeQuests.get(questId);

        if (!quest) return false;

        return quest.objectives.every(
            isObjectiveCompleted
        );
    }

    function getQuestProgress(questId) {

        const quest = activeQuests.get(questId);

        if (!quest) return null;

        const total = quest.objectives.length;

        const completed = quest.objectives.filter(
            isObjectiveCompleted
        ).length;

        return {
            total,
            completed,
            percentage: total === 0
                ? 100
                : Math.floor(completed / total * 100)
        };
    }

    // =====================================
    // QUEST REWARDS
    // =====================================

    function claimReward(questId) {

        const quest = activeQuests.get(questId);

        if (!quest) {
            return {
                success: false,
                message: "ไม่พบภารกิจที่กำลังทำ"
            };
        }

        if (!isQuestCompleted(questId)) {
            return {
                success: false,
                message: "คุณยังทำภารกิจไม่สำเร็จ"
            };
        }

        const rewards = quest.rewards || {};

        const player = window.ECHO_GAME?.player;

        if (player) {

            if (rewards.gold) {
                player.gold = (player.gold || 0) + rewards.gold;
            }

            if (
                rewards.exp &&
                window.PlayerSystem &&
                player.id
            ) {
                window.PlayerSystem.addExperience(
                    player.id,
                    rewards.exp
                );
            }
        }

        completedQuests.add(questId);
        activeQuests.delete(questId);

        return {
            success: true,
            rewards,
            message: "รับรางวัลเรียบร้อย"
        };
    }

    // =====================================
    // CANCEL QUEST
    // =====================================

    function cancelQuest(questId) {

        const quest = activeQuests.get(questId);

        if (!quest) return false;

        activeQuests.delete(questId);

        return true;
    }

    // =====================================
    // QUEST LISTS
    // =====================================

    function getActiveQuests() {

        return Array.from(activeQuests.values());
    }

    function getCompletedQuests() {

        return Array.from(completedQuests);
    }

    function getActiveQuest(questId) {

        return activeQuests.get(questId) || null;
    }

    // =====================================
    // QUEST EVENTS
    // =====================================

    function onMonsterKilled(monsterType) {

        return updateObjective(
            "kill",
            monsterType,
            1
        );
    }

    function onItemCollected(itemId, amount = 1) {

        return updateObjective(
            "collect",
            itemId,
            amount
        );
    }

    function onNPCInteraction(npcId) {

        return updateObjective(
            "talk",
            npcId,
            1
        );
    }

    // =====================================
    // RESET DAILY QUESTS
    // =====================================

    function resetDailyQuests() {

        for (const [questId, quest] of activeQuests) {

            if (quest.type === "daily") {
                activeQuests.delete(questId);
            }
        }

        for (const [questId, quest] of quests) {

            if (quest.type === "daily") {
                completedQuests.delete(questId);
            }
        }
    }

    // =====================================
    // PUBLIC API
    // =====================================

    window.QuestSystem = {

        registerQuest,
        loadDefaultQuests,

        getQuest,
        getAllQuests,
        getAvailableQuests,

        acceptQuest,

        updateObjective,
        isObjectiveCompleted,
        isQuestCompleted,
        getQuestProgress,

        claimReward,
        cancelQuest,

        getActiveQuests,
        getCompletedQuests,
        getActiveQuest,

        onMonsterKilled,
        onItemCollected,
        onNPCInteraction,

        resetDailyQuests
    };

    console.log("ECHO ISLES Quest System loaded");

})();
