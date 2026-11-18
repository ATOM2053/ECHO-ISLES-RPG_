-- ==========================================
-- ECHO ISLES RPG
-- DATABASE SCHEMA
-- Version 1.0.0
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    is_banned BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- CHARACTERS
-- ==========================================

CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(20) NOT NULL UNIQUE,
    race VARCHAR(30) NOT NULL,
    gender VARCHAR(20) NOT NULL,

    level INTEGER NOT NULL DEFAULT 1,
    experience BIGINT NOT NULL DEFAULT 0,

    job VARCHAR(30) NOT NULL DEFAULT 'Adventurer',

    hp INTEGER NOT NULL DEFAULT 100,
    mp INTEGER NOT NULL DEFAULT 100,
    gold BIGINT NOT NULL DEFAULT 100,

    map_id VARCHAR(100) NOT NULL DEFAULT 'starting_village',

    position_x DOUBLE PRECISION NOT NULL DEFAULT 400,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 300,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id
ON characters(user_id);

CREATE INDEX IF NOT EXISTS idx_characters_map_id
ON characters(map_id);

-- ==========================================
-- CHARACTER APPEARANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS character_appearance (
    character_id UUID PRIMARY KEY REFERENCES characters(id)
        ON DELETE CASCADE,

    skin_color VARCHAR(30) DEFAULT 'default',
    face_id VARCHAR(50) DEFAULT 'face_01',
    hair_id VARCHAR(50) DEFAULT 'hair_01',
    hair_color VARCHAR(30) DEFAULT 'black',
    eye_color VARCHAR(30) DEFAULT 'brown',
    outfit_id VARCHAR(50) DEFAULT 'starter_outfit',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- CHARACTER PROFESSIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS character_professions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    character_id UUID NOT NULL REFERENCES characters(id)
        ON DELETE CASCADE,

    profession VARCHAR(30) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    experience BIGINT NOT NULL DEFAULT 0,

    UNIQUE(character_id, profession)
);

-- ==========================================
-- INVENTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS character_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    character_id UUID NOT NULL REFERENCES characters(id)
        ON DELETE CASCADE,

    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    slot INTEGER,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_character
ON character_inventory(character_id);

-- ==========================================
-- EQUIPMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS character_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    character_id UUID NOT NULL REFERENCES characters(id)
        ON DELETE CASCADE,

    slot VARCHAR(30) NOT NULL,
    item_id VARCHAR(100),

    UNIQUE(character_id, slot)
);

-- ==========================================
-- QUESTS
-- ==========================================

CREATE TABLE IF NOT EXISTS character_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    character_id UUID NOT NULL REFERENCES characters(id)
        ON DELETE CASCADE,

    quest_id VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    progress JSONB DEFAULT '{}',

    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,

    UNIQUE(character_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quests_character
ON character_quests(character_id);

-- ==========================================
-- GUILDS
-- ==========================================

CREATE TABLE IF NOT EXISTS guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(50) NOT NULL UNIQUE,
    leader_character_id UUID REFERENCES characters(id)
        ON DELETE SET NULL,

    level INTEGER NOT NULL DEFAULT 1,
    experience BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- GUILD MEMBERS
-- ==========================================

CREATE TABLE IF NOT EXISTS guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guild_id UUID NOT NULL REFERENCES guilds(id)
        ON DELETE CASCADE,

    character_id UUID NOT NULL REFERENCES characters(id)
        ON DELETE CASCADE,

    role VARCHAR(30) NOT NULL DEFAULT 'member',

    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(character_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild
ON guild_members(guild_id);

-- ==========================================
-- END OF SCHEMA
-- ==========================================
