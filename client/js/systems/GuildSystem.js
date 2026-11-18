/* =========================================
   ECHO ISLES RPG
   Guild System
   Version: 0.1.0
========================================= */

(function () {
    "use strict";

    const guilds = new Map();

    let currentGuildId = null;

    const MAX_GUILD_MEMBERS = 50;

    const GUILD_ROLES = {
        LEADER: "Leader",
        VICE_LEADER: "Vice Leader",
        OFFICER: "Officer",
        MEMBER: "Member"
    };

    const guildQuests = {
        monster_hunt: {
            id: "monster_hunt",
            name: "Monster Hunting",
            description: "กำจัดมอนสเตอร์ร่วมกัน",
            objective: "kill_monsters",
            target: 50,
            rewardExp: 500,
            rewardGold: 1000
        },

        resource_collection: {
            id: "resource_collection",
            name: "Resource Collection",
            description: "รวบรวมทรัพยากรให้กิลด์",
            objective: "collect_resources",
            target: 100,
            rewardExp: 350,
            rewardGold: 750
        },

        dungeon_exploration: {
            id: "dungeon_exploration",
            name: "Dungeon Exploration",
            description: "สำรวจดันเจี้ยน",
            objective: "complete_dungeons",
            target: 5,
            rewardExp: 1000,
            rewardGold: 2000
        }
    };

    function getPlayerId() {
        return window.ECHO_GAME?.player?.id || null;
    }

    function getPlayerName() {
        return window.ECHO_GAME?.player?.name || "Adventurer";
    }

    function getCurrentGuild() {
        if (!currentGuildId) {
            return null;
        }

        return guilds.get(currentGuildId) || null;
    }

    function getMember(guild, playerId) {
        if (!guild || !playerId) {
            return null;
        }

        return guild.members.find(
            member => member.id === playerId
        ) || null;
    }

    function hasPermission(guild, playerId, allowedRoles) {
        const member = getMember(guild, playerId);

        if (!member) {
            return false;
        }

        return allowedRoles.includes(member.role);
    }

    function createGuild(name, description = "") {
        const playerId = getPlayerId();

        if (!playerId) {
            return {
                success: false,
                message: "ไม่พบข้อมูลผู้เล่น"
            };
        }

        if (currentGuildId) {
            return {
                success: false,
                message: "คุณเป็นสมาชิกกิลด์อยู่แล้ว"
            };
        }

        if (typeof name !== "string") {
            return {
                success: false,
                message: "ชื่อกิลด์ไม่ถูกต้อง"
            };
        }

        name = name.trim();

        if (name.length < 3 || name.length > 24) {
            return {
                success: false,
                message: "ชื่อกิลด์ต้องมีความยาว 3-24 ตัวอักษร"
            };
        }

        if (
            Array.from(guilds.values()).some(
                guild => guild.name.toLowerCase() === name.toLowerCase()
            )
        ) {
            return {
                success: false,
                message: "ชื่อกิลด์นี้ถูกใช้แล้ว"
            };
        }

        const guildId = "guild_" + Date.now() + "_" +
            Math.random().toString(36).slice(2, 8);

        const guild = {
            id: guildId,
            name,
            description: String(description).slice(0, 300),

            level: 1,
            exp: 0,
            gold: 0,

            leaderId: playerId,

            members: [
                {
                    id: playerId,
                    name: getPlayerName(),
                    role: GUILD_ROLES.LEADER,
                    joinedAt: Date.now(),
                    online: true
                }
            ],

            storage: {},
            announcements: [],

            activeQuests: {},
            completedQuests: [],

            createdAt: Date.now()
        };

        guilds.set(guildId, guild);
        currentGuildId = guildId;

        return {
            success: true,
            guild
        };
    }

    function joinGuild(guildId) {
        const playerId = getPlayerId();

        if (!playerId) {
            return {
                success: false,
                message: "ไม่พบข้อมูลผู้เล่น"
            };
        }

        if (currentGuildId) {
            return {
                success: false,
                message: "คุณเป็นสมาชิกกิลด์อยู่แล้ว"
            };
        }

        const guild = guilds.get(guildId);

        if (!guild) {
            return {
                success: false,
                message: "ไม่พบกิลด์"
            };
        }

        if (guild.members.length >= MAX_GUILD_MEMBERS) {
            return {
                success: false,
                message: "กิลด์มีสมาชิกเต็มแล้ว"
            };
        }

        guild.members.push({
            id: playerId,
            name: getPlayerName(),
            role: GUILD_ROLES.MEMBER,
            joinedAt: Date.now(),
            online: true
        });

        currentGuildId = guildId;

        return {
            success: true,
            message: "เข้าร่วมกิลด์สำเร็จ"
        };
    }

    function leaveGuild() {
        const guild = getCurrentGuild();
        const playerId = getPlayerId();

        if (!guild) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในกิลด์"
            };
        }

        if (guild.leaderId === playerId) {
            return {
                success: false,
                message: "หัวหน้ากิลด์ต้องโอนตำแหน่งก่อนออก"
            };
        }

        guild.members = guild.members.filter(
            member => member.id !== playerId
        );

        currentGuildId = null;

        return {
            success: true,
            message: "ออกจากกิลด์สำเร็จ"
        };
    }

    function kickMember(targetId) {
        const guild = getCurrentGuild();
        const playerId = getPlayerId();

        if (!guild) {
            return {
                success: false,
                message: "ไม่พบกิลด์"
            };
        }

        const allowed = [
            GUILD_ROLES.LEADER,
            GUILD_ROLES.VICE_LEADER
        ];

        if (!hasPermission(guild, playerId, allowed)) {
            return {
                success: false,
                message: "คุณไม่มีสิทธิ์เตะสมาชิก"
            };
        }

        if (targetId === guild.leaderId) {
            return {
                success: false,
                message: "ไม่สามารถเตะหัวหน้ากิลด์ได้"
            };
        }

        const target = getMember(guild, targetId);

        if (!target) {
            return {
                success: false,
                message: "ไม่พบสมาชิก"
            };
        }

        if (
            target.role === GUILD_ROLES.VICE_LEADER &&
            playerId !== guild.leaderId
        ) {
            return {
                success: false,
                message: "เฉพาะหัวหน้ากิลด์เท่านั้นที่จัดการรองหัวหน้าได้"
            };
        }

        guild.members = guild.members.filter(
            member => member.id !== targetId
        );

        return {
            success: true,
            message: "นำสมาชิกออกจากกิลด์แล้ว"
        };
    }

    function changeMemberRole(targetId, newRole) {
        const guild = getCurrentGuild();
        const playerId = getPlayerId();

        if (!guild || guild.leaderId !== playerId) {
            return {
                success: false,
                message: "ต้องเป็นหัวหน้ากิลด์เท่านั้น"
            };
        }

        const validRoles = [
            GUILD_ROLES.VICE_LEADER,
            GUILD_ROLES.OFFICER,
            GUILD_ROLES.MEMBER
        ];

        if (!validRoles.includes(newRole)) {
            return {
                success: false,
                message: "ตำแหน่งไม่ถูกต้อง"
            };
        }

        const target = getMember(guild, targetId);

        if (!target) {
            return {
                success: false,
                message: "ไม่พบสมาชิก"
            };
        }

        if (targetId === playerId) {
            return {
                success: false,
                message: "ไม่สามารถเปลี่ยนตำแหน่งตัวเองได้"
            };
        }

        target.role = newRole;

        return {
            success: true,
            message: "เปลี่ยนตำแหน่งสำเร็จ"
        };
    }

    function transferLeadership(targetId) {
        const guild = getCurrentGuild();
        const playerId = getPlayerId();

        if (!guild || guild.leaderId !== playerId) {
            return {
                success: false,
                message: "คุณไม่ใช่หัวหน้ากิลด์"
            };
        }

        const target = getMember(guild, targetId);

        if (!target || targetId === playerId) {
            return {
                success: false,
                message: "ไม่พบสมาชิกเป้าหมาย"
            };
        }

        const currentLeader = getMember(guild, playerId);

        if (currentLeader) {
            currentLeader.role = GUILD_ROLES.VICE_LEADER;
        }

        target.role = GUILD_ROLES.LEADER;
        guild.leaderId = targetId;

        return {
            success: true,
            message: "โอนตำแหน่งหัวหน้ากิลด์สำเร็จ"
        };
    }

    function addGuildExperience(amount) {
        const guild = getCurrentGuild();

        if (!guild) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในกิลด์"
            };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                success: false,
                message: "จำนวน EXP ไม่ถูกต้อง"
            };
        }

        guild.exp += Math.floor(amount);

        let leveledUp = false;

        function requiredExp(level) {
            return level * 1000;
        }

        while (
            guild.level < 100 &&
            guild.exp >= requiredExp(guild.level)
        ) {
            guild.exp -= requiredExp(guild.level);
            guild.level++;
            leveledUp = true;
        }

        return {
            success: true,
            level: guild.level,
            exp: guild.exp,
            requiredExp: requiredExp(guild.level),
            leveledUp
        };
    }

    function getGuildQuestList() {
        return Object.values(guildQuests);
    }

    function acceptGuildQuest(questId) {
        const guild = getCurrentGuild();

        if (!guild) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในกิลด์"
            };
        }

        const quest = guildQuests[questId];

        if (!quest) {
            return {
                success: false,
                message: "ไม่พบภารกิจ"
            };
        }

        if (guild.activeQuests[questId]) {
            return {
                success: false,
                message: "กิลด์รับภารกิจนี้แล้ว"
            };
        }

        if (guild.completedQuests.includes(questId)) {
            return {
                success: false,
                message: "กิลด์ทำภารกิจนี้สำเร็จแล้ว"
            };
        }

        guild.activeQuests[questId] = {
            ...quest,
            progress: 0,
            completed: false
        };

        return {
            success: true,
            message: "รับภารกิจกิลด์สำเร็จ"
        };
    }

    function updateGuildQuest(questId, amount = 1) {
        const guild = getCurrentGuild();

        if (!guild) {
            return false;
        }

        const quest = guild.activeQuests[questId];

        if (!quest || quest.completed) {
            return false;
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return false;
        }

        quest.progress = Math.min(
            quest.target,
            quest.progress + amount
        );

        if (quest.progress >= quest.target) {
            quest.completed = true;
        }

        return true;
    }

    function claimGuildQuestReward(questId) {
        const guild = getCurrentGuild();

        if (!guild) {
            return {
                success: false,
                message: "ไม่พบกิลด์"
            };
        }

        const quest = guild.activeQuests[questId];

        if (!quest || !quest.completed) {
            return {
                success: false,
                message: "ภารกิจยังไม่สำเร็จ"
            };
        }

        guild.exp += quest.rewardExp;
        guild.gold += quest.rewardGold;

        guild.completedQuests.push(questId);

        delete guild.activeQuests[questId];

        return {
            success: true,
            rewardExp: quest.rewardExp,
            rewardGold: quest.rewardGold
        };
    }

    function depositGuildItem(itemId, amount) {
        const guild = getCurrentGuild();

        if (!guild) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในกิลด์"
            };
        }

        if (
            typeof itemId !== "string" ||
            !Number.isInteger(amount) ||
            amount <= 0 ||
            amount > 1000
        ) {
            return {
                success: false,
                message: "ข้อมูลไอเทมไม่ถูกต้อง"
            };
        }

        const inventory = window.InventorySystem;

        if (!inventory || !inventory.hasItem(itemId, amount)) {
            return {
                success: false,
                message: "ไอเทมในกระเป๋าไม่เพียงพอ"
            };
        }

        const removed = inventory.removeItem(itemId, amount);

        if (!removed || !removed.success) {
            return {
                success: false,
                message: "ไม่สามารถนำไอเทมออกจากกระเป๋าได้"
            };
        }

        guild.storage[itemId] =
            (guild.storage[itemId] || 0) + amount;

        return {
            success: true,
            message: "ฝากไอเทมเข้าคลังกิลด์สำเร็จ"
        };
    }

    function withdrawGuildItem(itemId, amount) {
        const guild = getCurrentGuild();
        const playerId = getPlayerId();

        if (!guild) {
            return {
                success: false,
                message: "คุณไม่ได้อยู่ในกิลด์"
            };
        }

        if (!hasPermission(guild, playerId, [
            GUILD_ROLES.LEADER,
            GUILD_ROLES.VICE_LEADER,
            GUILD_ROLES.OFFICER
        ])) {
            return {
                success: false,
                message: "คุณไม่มีสิทธิ์เบิกไอเทม"
            };
        }

        if (
            !Number.isInteger(amount) ||
            amount <= 0 ||
            amount > 1000
        ) {
            return {
                success: false,
                message: "จำนวนไอเทมไม่ถูกต้อง"
            };
        }

        if ((guild.storage[itemId] || 0) < amount) {
            return {
                success: false,
                message: "ไอเทมในคลังกิลด์ไม่เพียงพอ"
            };
        }

        const inventory = window.InventorySystem;

        if (!inventory) {
            return {
                success: false,
                message: "ระบบกระเป๋ายังไม่พร้อม"
            };
        }

        const added = inventory.addItem(itemId, amount);

        if (!added || !added.success) {
            return {
                success: false,
                message: "กระเป๋าของคุณไม่สามารถรับไอเทมได้"
            };
        }

        guild.storage[itemId] -= amount;

        if (guild.storage[itemId] <= 0) {
            delete guild.storage[itemId];
        }

        return {
            success: true,
            message: "เบิกไอเทมสำเร็จ"
        };
    }

    function addAnnouncement(message) {
        const guild = getCurrentGuild();
        const playerId = getPlayerId();

        if (!guild) {
            return {
                success: false,
                message: "ไม่พบกิลด์"
            };
        }

        if (!hasPermission(guild, playerId, [
            GUILD_ROLES.LEADER,
            GUILD_ROLES.VICE_LEADER,
            GUILD_ROLES.OFFICER
        ])) {
            return {
                success: false,
                message: "คุณไม่มีสิทธิ์ประกาศข่าวสาร"
            };
        }

        if (typeof message !== "string") {
            return {
                success: false,
                message: "ข้อความไม่ถูกต้อง"
            };
        }

        message = message.trim();

        if (!message || message.length > 300) {
            return {
                success: false,
                message: "ข้อความต้องมีความยาว 1-300 ตัวอักษร"
            };
        }

        guild.announcements.unshift({
            id: Date.now(),
            author: getPlayerName(),
            message,
            time: Date.now()
        });

        guild.announcements =
            guild.announcements.slice(0, 50);

        return {
            success: true,
            message: "ประกาศข่าวสารสำเร็จ"
        };
    }

    function getGuildInfo() {
        const guild = getCurrentGuild();

        if (!guild) {
            return null;
        }

        return {
            id: guild.id,
            name: guild.name,
            description: guild.description,
            level: guild.level,
            exp: guild.exp,
            gold: guild.gold,
            memberCount: guild.members.length,
            maxMembers: MAX_GUILD_MEMBERS,
            leaderId: guild.leaderId,
            createdAt: guild.createdAt
        };
    }

    function getGuildMembers() {
        const guild = getCurrentGuild();

        if (!guild) {
            return [];
        }

        return guild.members.map(member => ({ ...member }));
    }

    function getGuildStorage() {
        const guild = getCurrentGuild();

        if (!guild) {
            return {};
        }

        return { ...guild.storage };
    }

    function getAnnouncements() {
        const guild = getCurrentGuild();

        if (!guild) {
            return [];
        }

        return guild.announcements.map(item => ({ ...item }));
    }

    function getActiveGuildQuests() {
        const guild = getCurrentGuild();

        if (!guild) {
            return [];
        }

        return Object.values(guild.activeQuests);
    }

    function setMemberOnline
