/* =========================================
   ECHO ISLES RPG
   CHARACTER SERVICE
   Version: 1.1.0
========================================= */

"use strict";

const { query } = require("../database");

const CharacterService = {

    settings: {
        minNameLength: 3,
        maxNameLength: 20,
        maxCharacters: 3
    },

    races: [
        "Human",
        "Elf",
        "Dark Elf",
        "Dwarf",
        "Beastkin",
        "Dragonkin"
    ],

    genders: [
        "Male",
        "Female"
    ],

    jobs: [
        "Adventurer",
        "Swordsman",
        "Knight",
        "Archer",
        "Mage",
        "Assassin",
        "Priest"
    ],

    validateName(name) {

        if (typeof name !== "string") {
            return false;
        }

        const value = name.trim();

        if (
            value.length < this.settings.minNameLength ||
            value.length > this.settings.maxNameLength
        ) {
            return false;
        }

        return /^[a-zA-Z0-9ก-๙_ ]+$/.test(value);

    },

    async getCharacters(accountId) {

        if (!accountId) {
            throw new Error("INVALID_ACCOUNT");
        }

        const result = await query(
            `
            SELECT
                id,
                name,
                race,
                gender,
                level,
                experience,
                job,
                hp,
                mp,
                gold,
                map_id,
                position_x,
                position_y
            FROM characters
            WHERE user_id = $1
            ORDER BY id ASC
            `,
            [accountId]
        );

        return result.rows;

    },

    async getCharacter(accountId, characterId) {

        if (!accountId || !characterId) {
            throw new Error("INVALID_CHARACTER");
        }

        const result = await query(
            `
            SELECT
                id,
                name,
                race,
                gender,
                level,
                experience,
                job,
                hp,
                mp,
                gold,
                map_id,
                position_x,
                position_y
            FROM characters
            WHERE id = $1
              AND user_id = $2
            LIMIT 1
            `,
            [characterId, accountId]
        );

        return result.rows[0] || null;

    },

    async createCharacter(accountId, data) {

        if (!accountId) {
            throw new Error("INVALID_ACCOUNT");
        }

        if (!data || typeof data !== "object") {
            throw new Error("INVALID_CHARACTER_DATA");
        }

        // Validate name
        if (!this.validateName(data.name)) {
            throw new Error("INVALID_CHARACTER_NAME");
        }

        // Validate race
        if (!this.races.includes(data.race)) {
            throw new Error("INVALID_CHARACTER_RACE");
        }

        // Validate gender
        if (!this.genders.includes(data.gender)) {
            throw new Error("INVALID_CHARACTER_GENDER");
        }

        // Check character limit
        const existing = await query(
            `
            SELECT COUNT(*)::int AS total
            FROM characters
            WHERE user_id = $1
            `,
            [accountId]
        );

        if (
            existing.rows[0].total >=
            this.settings.maxCharacters
        ) {
            throw new Error("MAX_CHARACTERS_REACHED");
        }

        try {

            const result = await query(
                `
                INSERT INTO characters (
                    user_id,
                    name,
                    race,
                    gender,
                    level,
                    experience,
                    job,
                    hp,
                    mp,
                    gold,
                    map_id,
                    position_x,
                    position_y
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    1,
                    0,
                    'Adventurer',
                    100,
                    100,
                    100,
                    'starting_village',
                    400,
                    300
                )
                RETURNING
                    id,
                    name,
                    race,
                    gender,
                    level,
                    experience,
                    job,
                    hp,
                    mp,
                    gold,
                    map_id,
                    position_x,
                    position_y
                `,
                [
                    accountId,
                    data.name.trim(),
                    data.race,
                    data.gender
                ]
            );

            return result.rows[0];

        } catch (error) {

            if (error.code === "23505") {
                throw new Error("CHARACTER_NAME_ALREADY_EXISTS");
            }

            throw error;

        }

    }

};

module.exports = CharacterService;
