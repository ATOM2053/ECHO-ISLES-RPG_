/* =========================================
   ECHO ISLES RPG
   Game Configuration
========================================= */

window.GAME_CONFIG = {

    // ข้อมูลเกม
    GAME: {
        NAME: "ECHO ISLES RPG",
        VERSION: "0.1.0",
        TYPE: "Online MMORPG"
    },

    // การตั้งค่าหน้าจอเกม
    DISPLAY: {
        WIDTH: 1280,
        HEIGHT: 720,
        TILE_SIZE: 32,
        PIXEL_RATIO: window.devicePixelRatio || 1
    },

    // การตั้งค่าโลก
    WORLD: {
        DEFAULT_MAP: "starting_village",
        DEFAULT_X: 400,
        DEFAULT_Y: 300,

        MAPS: [
            "starting_village",
            "moonlight_kingdom",
            "emerald_forest",
            "amber_desert",
            "frostfall_kingdom",
            "dragon_abyss",
            "ancient_ruins",
            "capital_city"
        ]
    },

    // การตั้งค่าตัวละคร
    PLAYER: {

        MOVEMENT_SPEED: 180,

        BASE_STATS: {
            LEVEL: 1,
            HP: 100,
            MP: 100,
            ATTACK: 10,
            DEFENSE: 5,
            CRITICAL: 5,
            GOLD: 100
        },

        RACES: [
            "Human",
            "Elf",
            "Dark Elf",
            "Dwarf",
            "Beastkin",
            "Dragonkin"
        ],

        GENDERS: [
            "Male",
            "Female"
        ]
    },

    // อาชีพต่อสู้
    COMBAT_CLASSES: [
        "Swordsman",
        "Knight",
        "Archer",
        "Mage",
        "Assassin",
        "Priest"
    ],

    // อาชีพดำรงชีวิตและการผลิต
    LIFE_PROFESSIONS: [
        "Blacksmith",
        "Alchemist",
        "Chef",
        "Tailor",
        "Miner",
        "Fisher",
        "Herbalist",
        "Woodcutter"
    ],

    // ระบบต่อสู้
    COMBAT: {
        BASIC_ATTACK_COOLDOWN: 500,
        DEFAULT_SKILL_COOLDOWN: 3000,
        DODGE_COOLDOWN: 2000,
        TARGET_RANGE: 250
    },

    // ระบบออนไลน์
    NETWORK: {
        SOCKET_PATH: "/socket.io",
        RECONNECT: true,
        RECONNECT_ATTEMPTS: 10,
        RECONNECT_DELAY: 2000
    },

    // ระบบมือถือ
    MOBILE: {
        ENABLE_VIRTUAL_JOYSTICK: true,
        ENABLE_TOUCH_CONTROLS: true,
        JOYSTICK_SIZE: 130
    },

    // ระบบเกม
    SYSTEMS: {
        DAY_NIGHT: true,
        WEATHER: true,
        MONSTER_RESPAWN: true,
        PLAYER_TRADING: true,
        GUILD_SYSTEM: true,
        PET_SYSTEM: true,
        MOUNT_SYSTEM: true
    }

};

console.log("ECHO ISLES RPG Configuration Loaded");
